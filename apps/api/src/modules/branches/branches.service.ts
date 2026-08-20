import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  UpdateBranchSettingsDto,
} from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branch.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        settings: true,
        _count: {
          select: {
            memberships: true,
            batches: true,
            sales: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        settings: true,
        memberships: {
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
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async create(dto: CreateBranchDto) {
    const existingCode = await this.prisma.branch.findUnique({
      where: { code: dto.code },
    });

    if (existingCode) {
      throw new ConflictException(`Branch code '${dto.code}' already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        email: dto.email || null,
        businessHours: dto.businessHours ? (typeof dto.businessHours === 'string' ? dto.businessHours : JSON.stringify(dto.businessHours)) : null,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        settings: {
          create: {
            invoicePrefix: dto.code,
            invoiceNextNumber: 1,
            thermalPaperWidth: '58mm',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        email: dto.email,
        businessHours: dto.businessHours !== undefined
          ? (dto.businessHours ? (typeof dto.businessHours === 'string' ? dto.businessHours : JSON.stringify(dto.businessHours)) : null)
          : undefined,
        isActive: dto.isActive,
        isDefault: dto.isDefault,
      },
      include: {
        settings: true,
      },
    });
  }

  async updateSettings(id: string, dto: UpdateBranchSettingsDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return this.prisma.branchSettings.upsert({
      where: { branchId: id },
      update: dto as any,
      create: {
        branchId: id,
        invoicePrefix: dto.invoicePrefix || branch.code,
        thermalPaperWidth: dto.thermalPaperWidth || '58mm',
        printerConfig: dto.printerConfig as any,
      },
    });
  }

  async delete(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true, batches: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    if (branch.isDefault) {
      throw new BadRequestException('Cannot delete the primary/default store branch');
    }

    if (branch._count.sales > 0 || branch._count.batches > 0) {
      await this.prisma.branch.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, message: 'Branch has historical sales/stock, so it was deactivated.', id };
    }

    await this.prisma.branchSettings.deleteMany({ where: { branchId: id } });
    await this.prisma.branchMembership.deleteMany({ where: { branchId: id } });
    await this.prisma.branch.delete({ where: { id } });

    return { success: true, message: 'Branch deleted successfully.', id };
  }
}

