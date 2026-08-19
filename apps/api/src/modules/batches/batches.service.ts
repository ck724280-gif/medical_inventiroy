import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchStatus } from '@medical-inventory/shared-types';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    branchId?: string;
    medicineId?: string;
    status?: BatchStatus | string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.medicineId) where.medicineId = query.medicineId;
    if (query?.status) where.status = query.status;

    const [total, batches] = await Promise.all([
      this.prisma.batch.count({ where }),
      this.prisma.batch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiryDate: 'asc' },
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              genericName: true,
              sku: true,
              dosageForm: true,
              baseUnit: true,
            },
          },
          branch: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: batches,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        medicine: true,
        branch: true,
        supplier: true,
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${id} not found`);
    }

    return batch;
  }

  async getExpiryDashboard(branchId?: string) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {
      currentQty: { gt: 0 },
      ...(branchId ? { branchId } : {}),
    };

    const [expired, expiring7, expiring30, expiring60, expiring90] = await Promise.all([
      // Already expired
      this.prisma.batch.findMany({
        where: { ...baseWhere, expiryDate: { lt: now } },
        include: { medicine: true, branch: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      }),
      // Expiring in 7 days
      this.prisma.batch.findMany({
        where: { ...baseWhere, expiryDate: { gte: now, lte: in7Days } },
        include: { medicine: true, branch: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      }),
      // Expiring in 30 days
      this.prisma.batch.findMany({
        where: { ...baseWhere, expiryDate: { gte: now, lte: in30Days } },
        include: { medicine: true, branch: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      }),
      // Expiring in 60 days
      this.prisma.batch.findMany({
        where: { ...baseWhere, expiryDate: { gte: now, lte: in60Days } },
        include: { medicine: true, branch: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      }),
      // Expiring in 90 days
      this.prisma.batch.findMany({
        where: { ...baseWhere, expiryDate: { gte: now, lte: in90Days } },
        include: { medicine: true, branch: true, supplier: true },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const calculateValue = (list: typeof expired) =>
      list.reduce((sum, b) => sum + b.currentQty * b.purchasePrice, 0);

    return {
      summary: {
        expiredCount: expired.length,
        expiredValue: calculateValue(expired),
        expiring7Count: expiring7.length,
        expiring30Count: expiring30.length,
        expiring30Value: calculateValue(expiring30),
        expiring60Count: expiring60.length,
        expiring90Count: expiring90.length,
      },
      expired,
      expiring7,
      expiring30,
      expiring60,
      expiring90,
    };
  }

  async updateStatus(id: string, status: BatchStatus) {
    const batch = await this.findOne(id);
    return this.prisma.batch.update({
      where: { id },
      data: { status },
    });
  }
}
