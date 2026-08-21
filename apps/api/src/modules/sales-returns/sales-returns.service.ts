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
  PaperWidth,
} from '@medical-inventory/shared-types';
import { formatDate, formatDateTime } from '@medical-inventory/shared-utils';

@Injectable()
export class SalesReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { branchId?: string; search?: string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { returnNumber: { contains: q, mode: 'insensitive' } },
        { salesInvoice: { invoiceNumber: { contains: q, mode: 'insensitive' } } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q, mode: 'insensitive' } } },
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
          salesInvoice: { select: { invoiceNumber: true, createdAt: true, totalAmount: true } },
          customer: { select: { id: true, name: true, mobile: true } },
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
        salesInvoice: {
          include: {
            items: { include: { medicine: true, batch: true } },
            payments: true,
          },
        },
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

  async getReturnReceiptData(id: string) {
    const returnRecord = await this.findOne(id);
    const [business, template] = await Promise.all([
      this.prisma.businessSettings.findUnique({ where: { id: 'default' } }),
      this.prisma.receiptTemplate.findFirst({ where: { isDefault: true } }),
    ]);

    const receiptItems = returnRecord.items.map((item) => {
      const originalSalesItem = returnRecord.salesInvoice.items.find(
        (si) => si.id === item.salesItemId
      );
      const rate = originalSalesItem ? (Number(originalSalesItem.lineTotal) / originalSalesItem.qty) : 0;
      return {
        name: item.medicine.name,
        batch: item.batch?.batchNumber || 'N/A',
        qty: item.returnQty,
        condition: item.condition,
        reason: item.reason || 'Customer Return',
        rate,
        total: rate * item.returnQty,
      };
    });

    return {
      storeName: business?.name || 'MedCare Pharmacy',
      logo: business?.logo || null,
      address: `${returnRecord.branch?.address || ''}, ${returnRecord.branch?.city || ''}, ${returnRecord.branch?.state || ''} - ${business?.pinZip || ''}`,
      phone: returnRecord.branch?.phone || business?.phone || '',
      email: returnRecord.branch?.email || business?.email || '',
      gstNumber: business?.gstNumber || '',
      pharmacyLicense: business?.pharmacyLicense || '',
      returnNumber: returnRecord.returnNumber,
      originalInvoiceNumber: returnRecord.salesInvoice.invoiceNumber,
      date: formatDate(returnRecord.createdAt),
      time: formatDateTime(returnRecord.createdAt).split(' ').slice(1).join(' '),
      customerName: returnRecord.customer?.name || 'Walk-in Customer',
      customerMobile: returnRecord.customer?.mobile || null,
      items: receiptItems,
      refundAmount: Number(returnRecord.refundAmount || 0),
      refundMode: returnRecord.refundMode,
      notes: returnRecord.notes,
      headerText: 'SALES RETURN & CREDIT MEMORANDUM',
      footerText: 'This document certifies the accepted return of goods and refund/credit adjustment.',
      thankYouMessage: 'Return Processed Successfully',
      paperWidth: PaperWidth.WIDTH_58MM,
    };
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

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const returnCount = await tx.salesReturn.count();
      const returnNumber = `RET-${today}-${String(returnCount + 1).padStart(4, '0')}`;

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
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { increment: item.returnQty } },
          }).catch(() => {});
        } else if (item.condition === ReturnCondition.DAMAGED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { damagedQty: { increment: item.returnQty } },
          }).catch(() => {});
        } else if (item.condition === ReturnCondition.EXPIRED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { expiredQty: { increment: item.returnQty } },
          }).catch(() => {});
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
      if (invoice.customerId && (dto.refundMode === PaymentMode.CREDIT || dto.refundMode === 'CREDIT' as any)) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: { decrement: totalRefund } },
        }).catch(() => {});
      }

      // Determine whether all sold items have now been returned
      let totalSoldAcrossInvoice = 0;
      let totalReturnedAcrossInvoice = 0;

      for (const si of invoice.items) {
        totalSoldAcrossInvoice += si.qty;
        const previouslyReturned = invoice.returns.reduce((sum, r) => {
          const matching = r.items.find((ri) => ri.salesItemId === si.id);
          return sum + (matching?.returnQty || 0);
        }, 0);
        const currentReturned = dto.items.find((ri) => ri.salesItemId === si.id)?.returnQty || 0;
        totalReturnedAcrossInvoice += (previouslyReturned + currentReturned);
      }

      const isFullyReturned = totalReturnedAcrossInvoice >= totalSoldAcrossInvoice;

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: isFullyReturned ? 'RETURNED' : 'PARTIALLY_RETURNED' },
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
          }).catch(() => {});
        } else if (item.condition === ReturnCondition.DAMAGED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { damagedQty: { decrement: item.returnQty } },
          }).catch(() => {});
        } else if (item.condition === ReturnCondition.EXPIRED) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { expiredQty: { decrement: item.returnQty } },
          }).catch(() => {});
        }

        // Add adjustment stock movement log
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
      if (returnRecord.customerId && (returnRecord.refundMode === PaymentMode.CREDIT || returnRecord.refundMode === 'CREDIT' as any)) {
        await tx.customer.update({
          where: { id: returnRecord.customerId },
          data: {
            currentBalance: {
              increment: Number(returnRecord.refundAmount),
            },
          },
        }).catch(() => {});
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
    if (dto.returnNumber !== undefined && dto.returnNumber.trim()) {
      updateData.returnNumber = dto.returnNumber.trim();
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.createdAt !== undefined) updateData.createdAt = new Date(dto.createdAt);
    if (dto.refundMode !== undefined) updateData.refundMode = dto.refundMode;
    if (dto.refundAmount !== undefined) updateData.refundAmount = Number(dto.refundAmount);

    await this.prisma.$transaction(async (tx) => {
      // If refund mode changed to/from CREDIT, adjust customer balance
      if (dto.refundMode !== undefined && dto.refundMode !== returnRecord.refundMode) {
        if (returnRecord.customerId) {
          if (dto.refundMode === PaymentMode.CREDIT || dto.refundMode === 'CREDIT') {
            await tx.customer.update({
              where: { id: returnRecord.customerId },
              data: { currentBalance: { decrement: Number(returnRecord.refundAmount) } },
            }).catch(() => {});
          } else if (returnRecord.refundMode === PaymentMode.CREDIT || returnRecord.refundMode === 'CREDIT' as any) {
            await tx.customer.update({
              where: { id: returnRecord.customerId },
              data: { currentBalance: { increment: Number(returnRecord.refundAmount) } },
            }).catch(() => {});
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

