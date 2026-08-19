import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManufacturersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.manufacturer.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { medicines: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({
      where: { id },
      include: {
        medicines: {
          take: 20,
          select: { id: true, name: true, sku: true, dosageForm: true },
        },
        _count: { select: { medicines: true } },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with ID ${id} not found`);
    }

    return manufacturer;
  }

  async create(data: { name: string; contactPerson?: string; phone?: string; email?: string; address?: string }) {
    const existing = await this.prisma.manufacturer.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException(`Manufacturer '${data.name}' already exists`);

    return this.prisma.manufacturer.create({ data });
  }

  async update(id: string, data: { name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.manufacturer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.manufacturer.delete({ where: { id } });
  }
}
