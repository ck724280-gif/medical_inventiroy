import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 30;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.userId) where.userId = query.userId;
    if (query?.entity) where.entity = query.entity;
    if (query?.action) where.action = query.action;
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query?.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query?.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
