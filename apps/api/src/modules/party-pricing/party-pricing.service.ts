import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolvePartyItemPrice } from '@medical-inventory/shared-utils';

@Injectable()
export class PartyPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId?: string) {
    return this.prisma.partyItemPrice.create({
      data: {
        partyType: data.partyType || 'CUSTOMER',
        customerId: data.customerId || null,
        supplierId: data.supplierId || null,
        medicineId: data.medicineId,
        customPrice: Number(data.customPrice || 0),
        discountPercent: Number(data.discountPercent || 0),
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        notes: data.notes || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
      include: {
        medicine: true,
        customer: true,
        supplier: true,
      },
    });
  }

  async findAll(query: {
    partyType?: string;
    customerId?: string;
    supplierId?: string;
    medicineId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.partyType) where.partyType = query.partyType;
    if (query.customerId) where.customerId = query.customerId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.medicineId) where.medicineId = query.medicineId;

    const [data, total] = await Promise.all([
      this.prisma.partyItemPrice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: { select: { id: true, name: true, sku: true, mrp: true, defaultSellingPrice: true } },
          customer: { select: { id: true, name: true, mobile: true } },
          supplier: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.partyItemPrice.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findEffective(query: {
    partyType?: string;
    customerId?: string;
    supplierId?: string;
    medicineId: string;
  }) {
    const where: any = {
      medicineId: query.medicineId,
      isActive: true,
    };
    if (query.customerId) where.customerId = query.customerId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.partyType) where.partyType = query.partyType;

    const rules = await this.prisma.partyItemPrice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const medicine = await this.prisma.medicine.findUnique({
      where: { id: query.medicineId },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    const now = new Date();
    const activeRule = rules.find((r) => {
      if (r.effectiveFrom && new Date(r.effectiveFrom) > now) return false;
      if (r.effectiveTo && new Date(r.effectiveTo) < now) return false;
      return true;
    });

    const resolved = resolvePartyItemPrice(
      medicine.defaultSellingPrice,
      medicine.mrp,
      activeRule || null,
      now
    );

    return {
      medicineId: medicine.id,
      medicineName: medicine.name,
      baseSellingPrice: medicine.defaultSellingPrice,
      baseMrp: medicine.mrp,
      effectivePrice: resolved.price,
      discountPercent: resolved.discountPercent,
      isCustomPrice: resolved.isCustom,
      rule: activeRule || null,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.partyItemPrice.findUnique({
      where: { id },
      include: {
        medicine: true,
        customer: true,
        supplier: true,
      },
    });
    if (!item) throw new NotFoundException('Party price rule not found');
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.partyItemPrice.update({
      where: { id },
      data: {
        customPrice: data.customPrice !== undefined ? Number(data.customPrice) : undefined,
        discountPercent: data.discountPercent !== undefined ? Number(data.discountPercent) : undefined,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
        effectiveTo: data.effectiveTo !== undefined ? (data.effectiveTo ? new Date(data.effectiveTo) : null) : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
      include: {
        medicine: true,
        customer: true,
        supplier: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.partyItemPrice.delete({
      where: { id },
    });
  }
}
