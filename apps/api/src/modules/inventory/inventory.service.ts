import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockMovementType, MovementDirection, TransferStatus } from '@medical-inventory/shared-types';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStockOverview(query?: { branchId?: string; search?: string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { genericName: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, medicines] = await Promise.all([
      this.prisma.medicine.count({ where }),
      this.prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          baseUnit: true,
          category: true,
          batches: {
            where: query?.branchId
              ? { branchId: query.branchId, currentQty: { gt: 0 } }
              : { currentQty: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          },
        },
      }),
    ]);

    const data = medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      const totalStockValue = m.batches.reduce((sum, b) => sum + b.currentQty * b.purchasePrice, 0);

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        sku: m.sku,
        category: m.category?.name,
        baseUnit: m.baseUnit.name,
        reorderLevel: m.reorderLevel,
        reorderQty: m.reorderQty,
        totalStock,
        totalStockValue,
        isLowStock: totalStock <= m.reorderLevel && totalStock > 0,
        isOutOfStock: totalStock === 0,
        batches: m.batches,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStock(branchId?: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        baseUnit: true,
        category: true,
        batches: {
          where: branchId ? { branchId, currentQty: { gt: 0 } } : { currentQty: { gt: 0 } },
        },
      },
    });

    const lowStockItems = [];
    const criticalStockItems = [];
    const outOfStockItems = [];

    for (const m of medicines) {
      const currentStock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);

      if (currentStock === 0) {
        outOfStockItems.push({
          ...m,
          currentStock,
          suggestedReorderQty: m.reorderQty,
        });
      } else if (currentStock <= Math.floor(m.reorderLevel / 2)) {
        criticalStockItems.push({
          ...m,
          currentStock,
          suggestedReorderQty: m.reorderQty + (m.reorderLevel - currentStock),
        });
      } else if (currentStock <= m.reorderLevel) {
        lowStockItems.push({
          ...m,
          currentStock,
          suggestedReorderQty: m.reorderQty,
        });
      }
    }

    return {
      summary: {
        lowStockCount: lowStockItems.length,
        criticalStockCount: criticalStockItems.length,
        outOfStockCount: outOfStockItems.length,
      },
      lowStock: lowStockItems,
      criticalStock: criticalStockItems,
      outOfStock: outOfStockItems,
    };
  }

  async getMovements(query?: {
    branchId?: string;
    medicineId?: string;
    batchId?: string;
    type?: StockMovementType;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.medicineId) where.medicineId = query.medicineId;
    if (query?.batchId) where.batchId = query.batchId;
    if (query?.type) where.type = query.type;

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: { select: { id: true, name: true, sku: true } },
          batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      data: movements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAdjustment(
    dto: {
      branchId: string;
      medicineId: string;
      batchId: string;
      adjustmentQty: number; // can be + or -
      reason: string;
      notes?: string;
    },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: dto.batchId },
      });

      if (!batch) {
        throw new NotFoundException('Batch not found');
      }

      const existingQty = batch.currentQty;
      const newQty = existingQty + dto.adjustmentQty;

      if (newQty < 0) {
        throw new BadRequestException(
          `Adjustment of ${dto.adjustmentQty} exceeds current stock (${existingQty})`
        );
      }

      // Update Batch stock
      await tx.batch.update({
        where: { id: dto.batchId },
        data: { currentQty: newQty },
      });

      // Record Stock Adjustment
      const adjustment = await tx.stockAdjustment.create({
        data: {
          branchId: dto.branchId,
          medicineId: dto.medicineId,
          batchId: dto.batchId,
          existingQty,
          adjustmentQty: dto.adjustmentQty,
          newQty,
          reason: dto.reason,
          adjustedByUserId: userId,
          notes: dto.notes || null,
        },
      });

      // Record immutable Stock Movement
      await tx.stockMovement.create({
        data: {
          branchId: dto.branchId,
          medicineId: dto.medicineId,
          batchId: dto.batchId,
          qty: Math.abs(dto.adjustmentQty),
          direction: dto.adjustmentQty > 0 ? MovementDirection.IN : MovementDirection.OUT,
          type: StockMovementType.ADJUSTMENT,
          referenceType: 'StockAdjustment',
          referenceId: adjustment.id,
          userId,
          reason: dto.reason,
        },
      });

      return adjustment;
    });
  }

  async createTransfer(
    dto: {
      fromBranchId: string;
      toBranchId: string;
      notes?: string;
      items: { medicineId: string; batchId: string; qty: number }[];
    },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          status: TransferStatus.IN_TRANSIT,
          transferredByUserId: userId,
          notes: dto.notes || null,
          items: {
            create: dto.items.map((item) => ({
              medicineId: item.medicineId,
              batchId: item.batchId,
              qty: item.qty,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct from source branch batches immediately
      for (const item of dto.items) {
        const sourceBatch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (!sourceBatch || sourceBatch.currentQty < item.qty) {
          throw new BadRequestException(
            `Insufficient stock in source batch ${sourceBatch?.batchNumber || item.batchId}`
          );
        }

        await tx.batch.update({
          where: { id: item.batchId },
          data: { currentQty: sourceBatch.currentQty - item.qty },
        });

        // Record stock movement OUT
        await tx.stockMovement.create({
          data: {
            branchId: dto.fromBranchId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            qty: item.qty,
            direction: MovementDirection.OUT,
            type: StockMovementType.TRANSFER_OUT,
            referenceType: 'StockTransfer',
            referenceId: transfer.id,
            userId,
            reason: `Transfer to branch ${dto.toBranchId}`,
          },
        });
      }

      return transfer;
    });
  }

  async receiveTransfer(transferId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new BadRequestException(`Transfer is not in transit (status: ${transfer.status})`);
      }

      for (const item of transfer.items) {
        const sourceBatch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (!sourceBatch) throw new NotFoundException(`Batch ${item.batchId} not found`);

        // Find or create batch at destination branch
        let destBatch = await tx.batch.findUnique({
          where: {
            medicineId_branchId_batchNumber: {
              medicineId: item.medicineId,
              branchId: transfer.toBranchId,
              batchNumber: sourceBatch.batchNumber,
            },
          },
        });

        if (destBatch) {
          await tx.batch.update({
            where: { id: destBatch.id },
            data: { currentQty: destBatch.currentQty + item.qty },
          });
        } else {
          destBatch = await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              branchId: transfer.toBranchId,
              batchNumber: sourceBatch.batchNumber,
              mfgDate: sourceBatch.mfgDate,
              expiryDate: sourceBatch.expiryDate,
              supplierId: sourceBatch.supplierId,
              purchasePrice: sourceBatch.purchasePrice,
              mrp: sourceBatch.mrp,
              sellingPrice: sourceBatch.sellingPrice,
              taxPercent: sourceBatch.taxPercent,
              initialQty: item.qty,
              currentQty: item.qty,
              status: sourceBatch.status,
            },
          });
        }

        // Record stock movement IN at destination branch
        await tx.stockMovement.create({
          data: {
            branchId: transfer.toBranchId,
            medicineId: item.medicineId,
            batchId: destBatch.id,
            qty: item.qty,
            direction: MovementDirection.IN,
            type: StockMovementType.TRANSFER_IN,
            referenceType: 'StockTransfer',
            referenceId: transfer.id,
            userId,
            reason: `Transfer from branch ${transfer.fromBranchId}`,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RECEIVED,
          receivedByUserId: userId,
        },
      });
    });
  }
}
