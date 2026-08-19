import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockMovementType, MovementDirection, DosageForm, BatchStatus } from '@medical-inventory/shared-types';

export interface OpeningStockRow {
  medicineName: string;
  sku?: string;
  dosageForm?: DosageForm;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  taxPercent?: number;
}

@Injectable()
export class ImportExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Opening Stock Wizard: Validates array of records and commits them transactionally.
   */
  async importOpeningStock(
    branchId: string,
    rows: OpeningStockRow[],
    userId: string
  ) {
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No rows provided for import');
    }

    const errors: { row: number; error: string }[] = [];

    // Validation pass
    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      if (!r.medicineName) errors.push({ row: rowNum, error: 'Medicine name is required' });
      if (!r.batchNumber) errors.push({ row: rowNum, error: 'Batch number is required' });
      if (!r.expiryDate) errors.push({ row: rowNum, error: 'Expiry date is required' });
      if (typeof r.qty !== 'number' || r.qty <= 0) errors.push({ row: rowNum, error: 'Quantity must be positive' });
      if (typeof r.purchasePrice !== 'number' || r.purchasePrice < 0) errors.push({ row: rowNum, error: 'Invalid purchase price' });
      if (typeof r.mrp !== 'number' || r.mrp < 0) errors.push({ row: rowNum, error: 'Invalid MRP' });
    });

    if (errors.length > 0) {
      return {
        success: false,
        message: `Validation failed with ${errors.length} error(s). No records were imported.`,
        errors,
      };
    }

    // Default base unit
    const defaultUnit = await this.prisma.unit.findFirst();
    if (!defaultUnit) throw new BadRequestException('No standard unit found. Please run seed.');

    // Transactional commit
    return this.prisma.$transaction(async (tx) => {
      let importedCount = 0;

      for (const row of rows) {
        // Find or create Medicine
        let medicine = await tx.medicine.findFirst({
          where: {
            OR: [
              row.sku ? { sku: row.sku } : undefined,
              { name: { equals: row.medicineName, mode: 'insensitive' } },
            ].filter(Boolean) as any,
          },
        });

        if (!medicine) {
          const autoSku = row.sku || `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          medicine = await tx.medicine.create({
            data: {
              name: row.medicineName,
              sku: autoSku,
              dosageForm: row.dosageForm || DosageForm.TABLET,
              baseUnitId: defaultUnit.id,
              mrp: row.mrp,
              defaultPurchasePrice: row.purchasePrice,
              defaultSellingPrice: row.sellingPrice || row.mrp,
              taxPercent: row.taxPercent || 0,
            },
          });
        }

        // Upsert Batch
        const mfg = row.mfgDate ? new Date(row.mfgDate) : new Date('2025-01-01');
        const exp = new Date(row.expiryDate);

        let batch = await tx.batch.findUnique({
          where: {
            medicineId_branchId_batchNumber: {
              medicineId: medicine.id,
              branchId,
              batchNumber: row.batchNumber,
            },
          },
        });

        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              currentQty: batch.currentQty + row.qty,
              purchasePrice: row.purchasePrice,
              mrp: row.mrp,
              sellingPrice: row.sellingPrice || row.mrp,
              status: BatchStatus.ACTIVE,
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              medicineId: medicine.id,
              branchId,
              batchNumber: row.batchNumber,
              mfgDate: mfg,
              expiryDate: exp,
              purchasePrice: row.purchasePrice,
              mrp: row.mrp,
              sellingPrice: row.sellingPrice || row.mrp,
              taxPercent: row.taxPercent || 0,
              initialQty: row.qty,
              currentQty: row.qty,
              status: BatchStatus.ACTIVE,
            },
          });
        }

        // Record stock movement (OPENING_STOCK)
        await tx.stockMovement.create({
          data: {
            branchId,
            medicineId: medicine.id,
            batchId: batch.id,
            qty: row.qty,
            direction: MovementDirection.IN,
            type: StockMovementType.OPENING_STOCK,
            referenceType: 'OpeningStockImport',
            userId,
            reason: 'Opening stock import wizard',
          },
        });

        importedCount++;
      }

      return {
        success: true,
        message: `Successfully imported opening stock for ${importedCount} items.`,
        importedCount,
      };
    });
  }
}
