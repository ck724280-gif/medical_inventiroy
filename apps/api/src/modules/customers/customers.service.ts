import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeCustomerData(data: any) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.mobile !== undefined) {
      payload.mobile = data.mobile && data.mobile.trim() ? data.mobile.trim() : null;
    }
    if (data.email !== undefined) {
      payload.email = data.email && data.email.trim() ? data.email.trim() : null;
    }
    if (data.address !== undefined) {
      payload.address = data.address && data.address.trim() ? data.address.trim() : null;
    }
    if (data.gstNumber !== undefined) {
      payload.gstNumber = data.gstNumber && data.gstNumber.trim() ? data.gstNumber.trim() : null;
    }
    if (data.notes !== undefined) {
      payload.notes = data.notes && data.notes.trim() ? data.notes.trim() : null;
    }
    if (data.creditLimit !== undefined) {
      payload.creditLimit = Number(data.creditLimit) || 0;
    }
    if (data.currentBalance !== undefined) {
      payload.currentBalance = Number(data.currentBalance) || 0;
    }
    if (data.isActive !== undefined) {
      payload.isActive = Boolean(data.isActive);
    }
    return payload;
  }

  async findAll(query?: { search?: string; isActive?: boolean | string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    } else {
      where.isActive = true;
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { gstNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { sales: true, returns: true },
          },
        },
      }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
        _count: {
          select: { sales: true, returns: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByMobile(mobile: string) {
    if (!mobile || !mobile.trim()) return null;
    return this.prisma.customer.findUnique({
      where: { mobile: mobile.trim() },
    });
  }

  async create(data: any) {
    const sanitized = this.sanitizeCustomerData(data);
    if (sanitized.mobile) {
      const existing = await this.prisma.customer.findUnique({
        where: { mobile: sanitized.mobile },
      });
      if (existing) {
        throw new ConflictException(`Customer with mobile '${sanitized.mobile}' already exists`);
      }
    }

    return this.prisma.customer.create({ data: sanitized });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const sanitized = this.sanitizeCustomerData(data);

    if (sanitized.mobile) {
      const existing = await this.prisma.customer.findUnique({
        where: { mobile: sanitized.mobile },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Another customer with mobile '${sanitized.mobile}' already exists`);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: sanitized,
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true, returns: true, PartyItemPrice: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const linkedCount =
      (customer._count?.sales || 0) +
      (customer._count?.returns || 0) +
      (customer._count?.PartyItemPrice || 0);

    if (linkedCount > 0) {
      return this.prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      return this.prisma.customer.delete({
        where: { id },
      });
    }
  }
}

