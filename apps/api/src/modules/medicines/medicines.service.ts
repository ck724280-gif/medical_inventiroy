import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicineDto, UpdateMedicineDto } from './dto/create-medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    dosageForm?: string;
    branchId?: string;
    isActive?: boolean | string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Default to active medicines unless explicitly requested otherwise
    if (query?.isActive !== undefined) {
      if (query.isActive !== 'all') {
        where.isActive = query.isActive === 'true' || query.isActive === true;
      }
    } else {
      where.isActive = true;
    }

    if (query?.categoryId) {
      where.OR = [
        { categoryId: query.categoryId },
        { subCategoryId: query.categoryId },
      ];
    }

    if (query?.manufacturerId) {
      where.manufacturerId = query.manufacturerId;
    }

    if (query?.dosageForm) {
      where.dosageForm = query.dosageForm;
    }

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { genericName: { contains: s, mode: 'insensitive' } },
        { brandName: { contains: s, mode: 'insensitive' } },
        { composition: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
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
          category: true,
          subCategory: true,
          manufacturer: true,
          baseUnit: true,
          units: {
            include: {
              fromUnit: true,
              toUnit: true,
            },
          },
          batches: query?.branchId
            ? {
                where: { branchId: query.branchId, currentQty: { gt: 0 } },
                orderBy: { expiryDate: 'asc' },
              }
            : {
                where: { currentQty: { gt: 0 } },
                orderBy: { expiryDate: 'asc' },
              },
        },
      }),
    ]);

    // Aggregate total current stock from batches
    const items = medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      const isLowStock = totalStock <= m.reorderLevel;
      const isOutOfStock = totalStock === 0;

      return {
        ...m,
        totalStock,
        isLowStock,
        isOutOfStock,
        activeBatchesCount: m.batches.length,
      };
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, branchId?: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        manufacturer: true,
        baseUnit: true,
        units: {
          include: {
            fromUnit: true,
            toUnit: true,
          },
        },
        batches: {
          where: branchId ? { branchId } : undefined,
          orderBy: { expiryDate: 'asc' },
          include: {
            branch: { select: { id: true, name: true, code: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${id} not found`);
    }

    const totalStock = medicine.batches.reduce((sum, b) => sum + b.currentQty, 0);

    return {
      ...medicine,
      totalStock,
      isLowStock: totalStock <= medicine.reorderLevel,
      isOutOfStock: totalStock === 0,
    };
  }

  async findByBarcode(barcode: string, branchId?: string) {
    const medicine = await this.prisma.medicine.findFirst({
      where: {
        OR: [
          { barcode },
          { sku: barcode },
          { eanUpcGtin: barcode },
          { barcodes: { some: { barcodeValue: barcode } } },
        ],
        isActive: true,
      },
      include: {
        baseUnit: true,
        batches: {
          where: {
            status: 'ACTIVE',
            currentQty: { gt: 0 },
            ...(branchId ? { branchId } : {}),
          },
          orderBy: { expiryDate: 'asc' }, // FEFO sort
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`No medicine found with barcode/SKU '${barcode}'`);
    }

    return medicine;
  }

  async create(dto: CreateMedicineDto) {
    const skuClean = dto.sku ? dto.sku.trim() : `MED-${Date.now().toString().slice(-6)}`;
    const existingSku = await this.prisma.medicine.findUnique({
      where: { sku: skuClean },
    });

    if (existingSku) {
      throw new ConflictException(`Medicine with SKU '${skuClean}' already exists`);
    }

    const { unitConversions, ...medicineData } = dto;

    // Sanitize empty strings to null or valid defaults
    const sanitizedData: any = {
      name: medicineData.name.trim(),
      genericName: medicineData.genericName?.trim() || null,
      brandName: medicineData.brandName?.trim() || null,
      composition: medicineData.composition?.trim() || null,
      strength: medicineData.strength?.trim() || null,
      dosageForm: medicineData.dosageForm,
      categoryId: medicineData.categoryId?.trim() || null,
      subCategoryId: medicineData.subCategoryId?.trim() || null,
      manufacturerId: medicineData.manufacturerId?.trim() || null,
      sku: skuClean,
      barcode: medicineData.barcode?.trim() || null,
      eanUpcGtin: medicineData.eanUpcGtin?.trim() || null,
      hsnCode: medicineData.hsnCode?.trim() || null,
      taxPercent: Number(medicineData.taxPercent || 0),
      baseUnitId: medicineData.baseUnitId,
      packSize: medicineData.packSize?.trim() || null,
      boxQty: medicineData.boxQty ? Number(medicineData.boxQty) : null,
      stripQty: medicineData.stripQty ? Number(medicineData.stripQty) : null,
      tabletQty: medicineData.tabletQty ? Number(medicineData.tabletQty) : null,
      stripsPerBox: medicineData.stripsPerBox ? Number(medicineData.stripsPerBox) : 10,
      tabletsPerStrip: medicineData.tabletsPerStrip ? Number(medicineData.tabletsPerStrip) : 10,
      drugSchedule: medicineData.drugSchedule || 'OTC',
      isScheduleH: medicineData.drugSchedule === 'SCHEDULE_H' || Boolean(medicineData.isScheduleH),
      isScheduleH1: medicineData.drugSchedule === 'SCHEDULE_H1' || Boolean(medicineData.isScheduleH1),
      isScheduleX: medicineData.drugSchedule === 'SCHEDULE_X' || Boolean(medicineData.isScheduleX),
      mrp: Number(medicineData.mrp || 0),
      defaultPurchasePrice: Number(medicineData.defaultPurchasePrice || 0),
      defaultSellingPrice: Number(medicineData.defaultSellingPrice || 0),
      reorderLevel: medicineData.reorderLevel ? Number(medicineData.reorderLevel) : 10,
      reorderQty: medicineData.reorderQty ? Number(medicineData.reorderQty) : 50,
      maxStock: medicineData.maxStock ? Number(medicineData.maxStock) : 1000,
      prescriptionRequired: Boolean(medicineData.prescriptionRequired || medicineData.drugSchedule !== 'OTC'),
      isActive: medicineData.isActive !== undefined ? Boolean(medicineData.isActive) : true,
      notes: medicineData.notes?.trim() || null,
    };

    const created = await this.prisma.medicine.create({
      data: {
        ...sanitizedData,
        units: unitConversions
          ? {
              create: unitConversions.map((uc) => ({
                fromUnitId: uc.fromUnitId,
                toUnitId: uc.toUnitId,
                conversionFactor: uc.conversionFactor,
              })),
            }
          : undefined,
      },
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateMedicineDto) {
    await this.findOne(id);

    if (dto.sku) {
      const skuClean = dto.sku.trim();
      const existing = await this.prisma.medicine.findFirst({
        where: { sku: skuClean, id: { not: id } },
      });
      if (existing) throw new ConflictException(`SKU '${skuClean}' is already in use`);
    }

    const sanitizedData: any = {};
    if (dto.name !== undefined) sanitizedData.name = dto.name.trim();
    if (dto.genericName !== undefined) sanitizedData.genericName = dto.genericName?.trim() || null;
    if (dto.brandName !== undefined) sanitizedData.brandName = dto.brandName?.trim() || null;
    if (dto.composition !== undefined) sanitizedData.composition = dto.composition?.trim() || null;
    if (dto.strength !== undefined) sanitizedData.strength = dto.strength?.trim() || null;
    if (dto.dosageForm !== undefined) sanitizedData.dosageForm = dto.dosageForm;
    if (dto.categoryId !== undefined) sanitizedData.categoryId = dto.categoryId?.trim() || null;
    if (dto.subCategoryId !== undefined) sanitizedData.subCategoryId = dto.subCategoryId?.trim() || null;
    if (dto.manufacturerId !== undefined) sanitizedData.manufacturerId = dto.manufacturerId?.trim() || null;
    if (dto.sku !== undefined) sanitizedData.sku = dto.sku.trim();
    if (dto.barcode !== undefined) sanitizedData.barcode = dto.barcode?.trim() || null;
    if (dto.eanUpcGtin !== undefined) sanitizedData.eanUpcGtin = dto.eanUpcGtin?.trim() || null;
    if (dto.hsnCode !== undefined) sanitizedData.hsnCode = dto.hsnCode?.trim() || null;
    if (dto.taxPercent !== undefined) sanitizedData.taxPercent = Number(dto.taxPercent);
    if (dto.baseUnitId !== undefined) sanitizedData.baseUnitId = dto.baseUnitId;
    if (dto.packSize !== undefined) sanitizedData.packSize = dto.packSize?.trim() || null;
    if (dto.boxQty !== undefined) sanitizedData.boxQty = dto.boxQty ? Number(dto.boxQty) : null;
    if (dto.stripQty !== undefined) sanitizedData.stripQty = dto.stripQty ? Number(dto.stripQty) : null;
    if (dto.tabletQty !== undefined) sanitizedData.tabletQty = dto.tabletQty ? Number(dto.tabletQty) : null;
    if (dto.stripsPerBox !== undefined) sanitizedData.stripsPerBox = Number(dto.stripsPerBox);
    if (dto.tabletsPerStrip !== undefined) sanitizedData.tabletsPerStrip = Number(dto.tabletsPerStrip);
    if (dto.drugSchedule !== undefined) {
      sanitizedData.drugSchedule = dto.drugSchedule;
      sanitizedData.isScheduleH = dto.drugSchedule === 'SCHEDULE_H';
      sanitizedData.isScheduleH1 = dto.drugSchedule === 'SCHEDULE_H1';
      sanitizedData.isScheduleX = dto.drugSchedule === 'SCHEDULE_X';
      sanitizedData.prescriptionRequired = dto.drugSchedule !== 'OTC' || Boolean(dto.prescriptionRequired);
    }
    if (dto.mrp !== undefined) sanitizedData.mrp = Number(dto.mrp);
    if (dto.defaultPurchasePrice !== undefined) sanitizedData.defaultPurchasePrice = Number(dto.defaultPurchasePrice);
    if (dto.defaultSellingPrice !== undefined) sanitizedData.defaultSellingPrice = Number(dto.defaultSellingPrice);
    if (dto.reorderLevel !== undefined) sanitizedData.reorderLevel = Number(dto.reorderLevel);
    if (dto.reorderQty !== undefined) sanitizedData.reorderQty = Number(dto.reorderQty);
    if (dto.maxStock !== undefined) sanitizedData.maxStock = Number(dto.maxStock);
    if (dto.prescriptionRequired !== undefined) sanitizedData.prescriptionRequired = Boolean(dto.prescriptionRequired);
    if (dto.isActive !== undefined) sanitizedData.isActive = Boolean(dto.isActive);
    if (dto.notes !== undefined) sanitizedData.notes = dto.notes?.trim() || null;

    await this.prisma.medicine.update({
      where: { id },
      data: sanitizedData,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const medicine = await this.findOne(id);

    // Check if medicine has transactional history (batches, sales, purchases, movements)
    const [batchesCount, salesItemsCount, purchaseItemsCount, movementsCount] = await Promise.all([
      this.prisma.batch.count({ where: { medicineId: id } }),
      this.prisma.salesItem.count({ where: { medicineId: id } }),
      this.prisma.purchaseItem.count({ where: { medicineId: id } }),
      this.prisma.stockMovement.count({ where: { medicineId: id } }),
    ]);

    const hasTransactions = batchesCount > 0 || salesItemsCount > 0 || purchaseItemsCount > 0 || movementsCount > 0;

    if (hasTransactions) {
      // Soft-delete to preserve data integrity and audits
      await this.prisma.medicine.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, mode: 'soft-delete', message: `Medicine "${medicine.name}" has been deactivated.` };
    } else {
      // Permanent hard-delete if no transactional records exist
      await this.prisma.$transaction(async (tx) => {
        await tx.medicineUnit.deleteMany({ where: { medicineId: id } });
        await tx.barcode.deleteMany({ where: { medicineId: id } });
        await tx.medicine.delete({ where: { id } });
      });
      return { success: true, mode: 'hard-delete', message: `Medicine "${medicine.name}" has been permanently deleted.` };
    }
  }
}
