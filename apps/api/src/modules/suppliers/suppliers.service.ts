import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeSupplierData(data: any) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.company !== undefined) payload.company = data.company ? data.company.trim() : null;
    if (data.contactPerson !== undefined) payload.contactPerson = data.contactPerson ? data.contactPerson.trim() : null;
    if (data.phone !== undefined) payload.phone = data.phone.trim();
    if (data.email !== undefined) payload.email = data.email ? data.email.trim() : null;
    if (data.gstNumber !== undefined) payload.gstNumber = data.gstNumber ? data.gstNumber.trim() : null;
    if (data.paymentTerms !== undefined) payload.paymentTerms = data.paymentTerms ? data.paymentTerms.trim() : null;
    if (data.creditLimit !== undefined) payload.creditLimit = Number(data.creditLimit) || 0;
    if (data.openingBalance !== undefined) payload.openingBalance = Number(data.openingBalance) || 0;
    if (data.currentBalance !== undefined) payload.currentBalance = Number(data.currentBalance) || 0;
    if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);

    // Combine address parts if provided
    let combinedAddress = data.address || '';
    const extraParts = [data.city, data.state, data.pinZip].filter(Boolean);
    if (extraParts.length > 0) {
      if (combinedAddress) {
        combinedAddress += ', ' + extraParts.join(', ');
      } else {
        combinedAddress = extraParts.join(', ');
      }
    }
    if (data.drugLicense) {
      combinedAddress = combinedAddress ? `${combinedAddress} (DL: ${data.drugLicense})` : `DL: ${data.drugLicense}`;
    }
    if (combinedAddress) {
      payload.address = combinedAddress.trim();
    } else if (data.address !== undefined) {
      payload.address = null;
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
        { company: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { gstNumber: { contains: q, mode: 'insensitive' } },
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
              returns: true,
              purchaseOrders: true,
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
    const sanitized = this.sanitizeSupplierData(data);
    return this.prisma.supplier.create({ data: sanitized });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const sanitized = this.sanitizeSupplierData(data);
    return this.prisma.supplier.update({
      where: { id },
      data: sanitized,
    });
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
            batches: true,
            returns: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    const linkedCount =
      (supplier._count?.purchases || 0) +
      (supplier._count?.batches || 0) +
      (supplier._count?.returns || 0) +
      (supplier._count?.purchaseOrders || 0);

    if (linkedCount > 0) {
      return this.prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      return this.prisma.supplier.delete({
        where: { id },
      });
    }
  }
}

