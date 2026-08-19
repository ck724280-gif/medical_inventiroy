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

      // Update Sales Invoice status if fully returned
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: 'RETURNED' },
      });

      return salesReturn;
    });
  }
}
