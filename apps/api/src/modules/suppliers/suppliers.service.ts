import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; isActive?: boolean | string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { gstNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              purchases: true,
              batches: true,
            },
          },
        },
      }),
    ]);

    return {
      data: suppliers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        returns: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async create(data: any) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.update(id, { isActive: false });
  }
}
