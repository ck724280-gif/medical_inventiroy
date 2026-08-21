import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReturnCondition,
  StockMovementType,
  MovementDirection,
  PaymentMode,
  SaleStatus,
} from '@medical-inventory/shared-types';
import { formatReturnNumber } from '@medical-inventory/shared-utils';

@Injectable()
export class SalesReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { branchId?: string; search?: string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.search) {
      where.OR = [
        { returnNumber: { contains: query.search, mode: 'insensitive' } },
        { salesInvoice: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, returns] = await Promise.all([
      this.prisma.salesReturn.count({ where }),
      this.prisma.salesReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          salesInvoice: { select: { invoiceNumber: true, createdAt: true } },
          customer: { select: { name: true, mobile: true } },
          branch: { select: { name: true } },
          items: {
            include: {
              medicine: { select: { name: true, sku: true } },
              batch: { select: { batchNumber: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const returnRecord = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: {
        salesInvoice: true,
        customer: true,
        branch: true,
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
      },
    });

    if (!returnRecord) {
      throw new NotFoundException(`Sales return with ID ${id} not found`);
    }

    return returnRecord;
  }

  async create(
    dto: {
      salesInvoiceId: string;
      branchId: string;
      refundMode?: PaymentMode;
      notes?: string;
      items: {
        salesItemId: string;
        medicineId: string;
        batchId: string;
        returnQty: number;
        condition: ReturnCondition;
        reason?: string;
      }[];
    },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: dto.salesInvoiceId },
        include: {
          items: true,
          payments: true,
          returns: { include: { items: true } },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found');
      }

      // Calculate return counts and validate return qty limits
      let totalRefund = 0;

      for (const returnItem of dto.items) {
        const salesItem = invoice.items.find((si) => si.id === returnItem.salesItemId);
        if (!salesItem) {
          throw new BadRequestException(`Item ${returnItem.salesItemId} does not belong to invoice`);
        }

        // Calculate already returned quantity for this sales item
        const previousReturnedQty = invoice.returns.reduce((sum, r) => {
          const matchingItem = r.items.find((ri) => ri.salesItemId === returnItem.salesItemId);
          return sum + (matchingItem?.returnQty || 0);
        }, 0);

        if (previousReturnedQty + returnItem.returnQty > salesItem.qty) {
          throw new BadRequestException(
            `Cannot return ${returnItem.returnQty} units. Already returned: ${previousReturnedQty}/${salesItem.qty}`
          );
        }

        // Calculate proportional refund based on selling rate
        const itemRefund = (salesItem.lineTotal / salesItem.qty) * returnItem.returnQty;
        totalRefund += itemRefund;
      }

      const returnCount = await tx.salesReturn.count();
      const returnNumber = formatReturnNumber('RET-S', returnCount + 1, 6);

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          salesInvoiceId: dto.salesInvoiceId,
          branchId: dto.branchId,
          customerId: invoice.customerId,
          status: 'COMPLETED',
          refundAmount: totalRefund,
          refundMode: dto.refundMode || PaymentMode.CASH,
          notes: dto.notes || null,
          createdByUserId: userId,
          items: {
            create: dto.items.map((item) => ({
              salesItemId: item.salesItemId,
              medicineId: item.medicineId,
              batchId: item.batchId,
              returnQty: item.returnQty,
              condition: item.condition,
              reason: item.reason || null,
            })),
          },
        },
        include: { items: true },
      });

      // Update Batches & Record Stock Movements
      for (const item of dto.items) {
        if (item.condition === ReturnCondition.RESALABLE) {
          // Only resalable returns restore live stock
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { increment: item.returnQty } },
          });
        } else if (item.condition === ReturnCondition.DAMAGED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { damagedQty: { increment: item.returnQty } },
          });
        } else if (item.condition === ReturnCondition.EXPIRED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { expiredQty: { increment: item.returnQty } },
          });
        }

        await tx.stockMovement.create({
          data: {
            branchId: dto.branchId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            qty: item.returnQty,
            direction: MovementDirection.IN,
            type: StockMovementType.SALES_RETURN,
            referenceType: 'SalesReturn',
            referenceId: salesReturn.id,
            userId,
            reason: `Sales Return #${returnNumber} (${item.condition})`,
          },
        });
      }

      // Update customer balance if credit refund
      if (invoice.customerId && (dto.refundMode === PaymentMode.CREDIT || invoice.payments.some(p => p.paymentMode === PaymentMode.CREDIT))) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: { decrement: totalRefund } },
        });
      }

      // Update Sales Invoice status if fully returned
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: 'RETURNED' },
      });

      return salesReturn;
    });
  }

  async deleteSalesReturn(id: string) {
    const returnRecord = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!returnRecord) {
      throw new NotFoundException(`Sales return with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Reverse Batch quantity adjustments
      for (const item of returnRecord.items) {
        if (item.condition === ReturnCondition.RESALABLE) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { decrement: item.returnQty } },
          });
        } else if (item.condition === ReturnCondition.DAMAGED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { damagedQty: { decrement: item.returnQty } },
          });
        } else if (item.condition === ReturnCondition.EXPIRED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { expiredQty: { decrement: item.returnQty } },
          });
        }

        // Also add a correction movement log
        await tx.stockMovement.create({
          data: {
            branchId: returnRecord.branchId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            qty: item.returnQty,
            direction: MovementDirection.OUT,
            type: StockMovementType.ADJUSTMENT,
            userId: returnRecord.createdByUserId,
            reason: `Sales Return #${returnRecord.returnNumber} cancelled. Restored.`,
          },
        });
      }

      // 2. Reverse Customer ledger adjustments if credit refund was applied
      if (returnRecord.customerId && returnRecord.refundMode === PaymentMode.CREDIT) {
        await tx.customer.update({
          where: { id: returnRecord.customerId },
          data: {
            currentBalance: {
              increment: Number(returnRecord.refundAmount),
            },
          },
        });
      }

      // 3. Update original Sales Invoice status back to COMPLETED
      await tx.salesInvoice.update({
        where: { id: returnRecord.salesInvoiceId },
        data: { status: 'COMPLETED' },
      });

      // 4. Delete stock movements
      await tx.stockMovement.deleteMany({
        where: { referenceType: 'SalesReturn', referenceId: id },
      });

      // 5. Delete sales return items
      await tx.salesReturnItem.deleteMany({
        where: { returnId: id },
      });

      // 6. Delete sales return
      await tx.salesReturn.delete({
        where: { id },
      });
    });

    return { success: true, message: `Sales Return #${returnRecord.returnNumber} successfully cancelled/deleted.` };
  }

  async updateSalesReturn(id: string, dto: any) {
    const returnRecord = await this.prisma.salesReturn.findUnique({
      where: { id },
    });

    if (!returnRecord) {
      throw new NotFoundException(`Sales return with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.createdAt !== undefined) updateData.createdAt = new Date(dto.createdAt);
    if (dto.refundMode !== undefined) updateData.refundMode = dto.refundMode;

    await this.prisma.$transaction(async (tx) => {
      // If refund mode changed to/from CREDIT, adjust customer balance
      if (dto.refundMode !== undefined && dto.refundMode !== returnRecord.refundMode) {
        if (returnRecord.customerId) {
          if (dto.refundMode === PaymentMode.CREDIT) {
            // New is credit: decrement customer balance (give back refund)
            await tx.customer.update({
              where: { id: returnRecord.customerId },
              data: { currentBalance: { decrement: Number(returnRecord.refundAmount) } },
            });
          } else if (returnRecord.refundMode === PaymentMode.CREDIT) {
            // Old was credit, new is not: reverse the credit decrement (increment balance)
            await tx.customer.update({
              where: { id: returnRecord.customerId },
              data: { currentBalance: { increment: Number(returnRecord.refundAmount) } },
            });
          }
        }
      }

      await tx.salesReturn.update({
        where: { id },
        data: updateData,
      });
    });

    return this.findOne(id);
  }
}
