import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StockMovementType,
  MovementDirection,
} from '@medical-inventory/shared-types';
import { formatReturnNumber } from '@medical-inventory/shared-utils';

@Injectable()
export class PurchaseReturnsService {
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
        { purchaseInvoice: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, returns] = await Promise.all([
      this.prisma.purchaseReturn.count({ where }),
      this.prisma.purchaseReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          purchaseInvoice: { select: { invoiceNumber: true } },
          supplier: { select: { name: true, phone: true } },
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
    const returnRecord = await this.prisma.purchaseReturn.findUnique({
      where: { id },
      include: {
        purchaseInvoice: true,
        supplier: true,
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
      throw new NotFoundException(`Purchase return with ID ${id} not found`);
    }

    return returnRecord;
  }

  async create(
    dto: {
      purchaseInvoiceId: string;
      supplierId: string;
      branchId: string;
      notes?: string;
      items: {
        purchaseItemId: string;
        medicineId: string;
        batchId: string;
        returnQty: number;
        reason?: string;
      }[];
    },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseInvoice.findUnique({
        where: { id: dto.purchaseInvoiceId },
        include: { items: true },
      });

      if (!purchase) {
        throw new NotFoundException('Purchase invoice not found');
      }

      let totalReturnAmount = 0;

      for (const item of dto.items) {
        const purchaseItem = purchase.items.find((pi) => pi.id === item.purchaseItemId);
        if (!purchaseItem) {
          throw new BadRequestException(`Purchase item ${item.purchaseItemId} not in invoice`);
        }

        const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
        if (!batch || batch.currentQty < item.returnQty) {
          throw new BadRequestException(
            `Insufficient stock to return in batch ${batch?.batchNumber || item.batchId}`
          );
        }

        totalReturnAmount += purchaseItem.purchasePrice * item.returnQty;
      }

      const returnCount = await tx.purchaseReturn.count();
      const returnNumber = formatReturnNumber('RET-P', returnCount + 1, 6);

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          purchaseInvoiceId: dto.purchaseInvoiceId,
          supplierId: dto.supplierId,
          branchId: dto.branchId,
          status: 'COMPLETED',
          totalAmount: totalReturnAmount,
          notes: dto.notes || null,
          createdByUserId: userId,
          items: {
            create: dto.items.map((item) => ({
              purchaseItemId: item.purchaseItemId,
              medicineId: item.medicineId,
              batchId: item.batchId,
              returnQty: item.returnQty,
              reason: item.reason || null,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock from Batches & record Stock Movements (OUT)
      for (const item of dto.items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { currentQty: { decrement: item.returnQty } },
        });

        await tx.stockMovement.create({
          data: {
            branchId: dto.branchId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            qty: item.returnQty,
            direction: MovementDirection.OUT,
            type: StockMovementType.PURCHASE_RETURN,
            referenceType: 'PurchaseReturn',
            referenceId: purchaseReturn.id,
            userId,
            reason: `Purchase Return #${returnNumber}`,
          },
        });
      }

      // Decrement supplier balance/credit
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: { currentBalance: { decrement: totalReturnAmount } },
      });

      return purchaseReturn;
    });
  }
}
