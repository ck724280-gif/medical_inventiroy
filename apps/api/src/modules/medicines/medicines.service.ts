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

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
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
      const s = query.search;
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
    const existingSku = await this.prisma.medicine.findUnique({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new ConflictException(`Medicine with SKU '${dto.sku}' already exists`);
    }

    const { unitConversions, ...medicineData } = dto;

    const created = await this.prisma.medicine.create({
      data: {
        ...medicineData,
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
      const existing = await this.prisma.medicine.findFirst({
        where: { sku: dto.sku, id: { not: id } },
      });
      if (existing) throw new ConflictException(`SKU '${dto.sku}' is already in use`);
    }

    await this.prisma.medicine.update({
      where: { id },
      data: dto as any,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    // Soft delete
    return this.update(id, { isActive: false });
  }
}
