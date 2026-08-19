import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isActive: r.isActive,
      userCount: r._count.users,
      permissions: r.permissions.map((p) => ({
        id: p.permission.id,
        code: p.permission.code,
        module: p.permission.module,
        description: p.permission.description,
      })),
    }));
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissions: role.permissions.map((p) => ({
        id: p.permission.id,
        code: p.permission.code,
        module: p.permission.module,
        description: p.permission.description,
      })),
    };
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        isSystem: false,
        permissions: {
          create: dto.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
    });

    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('System role names cannot be modified');
    }

    const data: any = {
      description: dto.description,
    };

    if (dto.name && !role.isSystem) {
      data.name = dto.name;
    }

    if (dto.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      data.permissions = {
        create: dto.permissionIds.map((permissionId) => ({ permissionId })),
      };
    }

    await this.prisma.role.update({
      where: { id },
      data,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('System default roles cannot be deleted');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(`Cannot delete role assigned to ${role._count.users} user(s)`);
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true, message: 'Role deleted successfully' };
  }
}
