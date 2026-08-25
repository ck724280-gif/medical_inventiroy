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
              ? { OR: [{ branchId: query.branchId }, { branchId: null }] }
              : {},
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
      branchId?: string;
      medicineId?: string;
      batchId: string;
      adjustmentQty?: number;
      newQty?: number;
      qty?: number;
      reason: string;
      notes?: string;
    },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: dto.batchId },
        include: { medicine: true },
      });

      if (!batch) {
        throw new NotFoundException('Batch not found');
      }

      const existingQty = batch.currentQty;
      let delta = 0;
      let finalNewQty = existingQty;

      if (dto.newQty !== undefined && dto.newQty !== null) {
        finalNewQty = Number(dto.newQty);
        delta = finalNewQty - existingQty;
      } else if (dto.adjustmentQty !== undefined && dto.adjustmentQty !== null) {
        delta = Number(dto.adjustmentQty);
        finalNewQty = existingQty + delta;
      } else if (dto.qty !== undefined && dto.qty !== null) {
        finalNewQty = Number(dto.qty);
        delta = finalNewQty - existingQty;
      }

      if (isNaN(finalNewQty) || finalNewQty < 0) {
        throw new BadRequestException(
          `Target stock quantity must be a non-negative number (received: ${finalNewQty})`
        );
      }

      const branchId = dto.branchId || batch.branchId;
      const medicineId = dto.medicineId || batch.medicineId;

      // 1. Update Batch stock
      await tx.batch.update({
        where: { id: dto.batchId },
        data: {
          currentQty: finalNewQty,
          status: finalNewQty === 0 ? 'DEPLETED' : 'ACTIVE',
        },
      });

      // 2. Record Stock Adjustment
      const adjustment = await tx.stockAdjustment.create({
        data: {
          branchId,
          medicineId,
          batchId: dto.batchId,
          existingQty,
          adjustmentQty: delta,
          newQty: finalNewQty,
          reason: dto.reason || 'PHYSICAL_MISMATCH',
          adjustedByUserId: userId,
          notes: dto.notes || `Stock adjusted from ${existingQty} to ${finalNewQty}`,
        },
      });

      // 3. Record immutable Stock Movement if delta != 0
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            branchId,
            medicineId,
            batchId: dto.batchId,
            qty: Math.abs(delta),
            direction: delta > 0 ? MovementDirection.IN : MovementDirection.OUT,
            type: StockMovementType.ADJUSTMENT,
            referenceType: 'StockAdjustment',
            referenceId: adjustment.id,
            userId,
            reason: dto.reason || 'Physical Stock Adjustment',
          },
        });
      }

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

  private parseFlexibleExpiryDate(dateStr?: any): Date {
    if (!dateStr) return new Date(Date.now() + 365 * 24 * 3600 * 1000);
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? new Date(Date.now() + 365 * 24 * 3600 * 1000) : dateStr;
    }
    const str = String(dateStr).trim();
    if (!str) return new Date(Date.now() + 365 * 24 * 3600 * 1000);

    // Format: MM/YYYY or MM-YYYY
    if (/^\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const month = parseInt(parts[0], 10);
      const year = parseInt(parts[1], 10);
      const d = new Date(year, month, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // Format: MM/YY or MM-YY
    if (/^\d{1,2}[\/\-]\d{2}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const month = parseInt(parts[0], 10);
      const year = 2000 + parseInt(parts[1], 10);
      const d = new Date(year, month, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // Format: DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Standard ISO parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;

    return new Date(Date.now() + 365 * 24 * 3600 * 1000);
  }

  async importOpeningStock(dto: { branchId?: string; items: any[] }, userId?: string) {
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('No items provided for opening stock migration');
    }

    let branchId = dto.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({ where: { isActive: true } });
      branchId = defaultBranch?.id || (await this.prisma.branch.findFirst())?.id;
    }

    if (!branchId) {
      throw new BadRequestException('No active branch found');
    }

    return this.prisma.$transaction(async (tx) => {
      let defaultUnit = await tx.unit.findFirst({ where: { name: 'TABLET' } });
      if (!defaultUnit) {
        defaultUnit = (await tx.unit.findFirst()) || (await tx.unit.create({
          data: { name: 'TABLET', abbreviation: 'TAB' }
        }));
      }

      let defaultCategory = await tx.medicineCategory.findFirst();
      if (!defaultCategory) {
        defaultCategory = await tx.medicineCategory.create({
          data: { name: 'General Medicines' }
        });
      }

      let createdCount = 0;

      for (const item of dto.items) {
        const name = (item.medicineName || item.name || '').trim();
        if (!name) continue;

        let medicine = await tx.medicine.findFirst({
          where: {
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              item.sku ? { sku: item.sku } : { id: '__none__' }
            ]
          }
        });

        const purchasePrice = Number(item.purchasePrice) || 0;
        const sellingPrice = Number(item.sellingPrice) || Number(item.mrp) || 0;
        const mrp = Number(item.mrp) || sellingPrice || 0;
        const qty = Number(item.qty) || 0;
        const hsnCode = item.hsnCode || item.hsn || null;
        const rackLocation = item.rackLocation || item.location || null;
        const taxPercent = Number(item.taxPercent) || 12;

        if (!medicine) {
          medicine = await tx.medicine.create({
            data: {
              name,
              sku: item.sku || `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
              categoryId: defaultCategory.id,
              baseUnitId: defaultUnit.id,
              defaultPurchasePrice: purchasePrice,
              defaultSellingPrice: sellingPrice,
              mrp,
              hsnCode,
              taxPercent,
              isActive: true,
            },
          });
        }

        const batchNumber = (item.batchNumber || `OPN-${Date.now().toString(36).toUpperCase()}`).trim();
        const expiryDate = this.parseFlexibleExpiryDate(item.expiryDate);

        let batch = await tx.batch.findUnique({
          where: {
            medicineId_branchId_batchNumber: {
              medicineId: medicine.id,
              branchId,
              batchNumber,
            },
          },
        });

        if (batch) {
          await tx.batch.update({
            where: { id: batch.id },
            data: {
              currentQty: { increment: qty },
              purchasePrice: purchasePrice || batch.purchasePrice,
              sellingPrice: sellingPrice || batch.sellingPrice,
              mrp: mrp || batch.mrp,
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              medicineId: medicine.id,
              branchId,
              batchNumber,
              mfgDate: new Date(),
              expiryDate,
              purchasePrice,
              sellingPrice,
              mrp,
              taxPercent,
              initialQty: qty,
              currentQty: qty,
              status: 'ACTIVE',
            },
          });
        }

        if (qty > 0) {
          await tx.stockMovement.create({
            data: {
              branchId,
              medicineId: medicine.id,
              batchId: batch.id,
              qty,
              direction: MovementDirection.IN,
              type: StockMovementType.OPENING_STOCK,
              reason: 'Opening stock import / migration',
              userId,
            }
          });
        }

        createdCount++;
      }

      return { success: true, createdCount };
    });
  }

  async getRecentOpeningStock(branchId?: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        type: StockMovementType.OPENING_STOCK,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        medicine: { select: { id: true, name: true, sku: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true, mrp: true, purchasePrice: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return movements.map((m) => ({
      id: m.id,
      medicineName: m.medicine?.name || 'Medicine',
      sku: m.medicine?.sku || '—',
      batchNumber: m.batch?.batchNumber || '—',
      expiryDate: m.batch?.expiryDate,
      qty: m.qty,
      purchasePrice: m.batch?.purchasePrice || 0,
      mrp: m.batch?.mrp || 0,
      createdAt: m.createdAt,
      userName: `${m.user?.firstName || 'Staff'} ${m.user?.lastName || ''}`.trim(),
    }));
  }
}
