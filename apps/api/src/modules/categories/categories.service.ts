import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.medicineCategory.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { medicines: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.medicineCategory.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        _count: { select: { medicines: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(data: { name: string; description?: string; parentId?: string }) {
    return this.prisma.medicineCategory.create({
      data: {
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; parentId?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.medicineCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.medicineCategory.delete({ where: { id } });
  }
}
