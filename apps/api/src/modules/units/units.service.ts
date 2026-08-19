import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async create(data: { name: string; abbreviation: string }) {
    const existing = await this.prisma.unit.findFirst({
      where: {
        OR: [{ name: data.name }, { abbreviation: data.abbreviation }],
      },
    });

    if (existing) {
      throw new ConflictException('Unit name or abbreviation already exists');
    }

    return this.prisma.unit.create({ data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.unit.delete({ where: { id } });
  }
}
