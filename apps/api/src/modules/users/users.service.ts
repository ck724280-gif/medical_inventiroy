import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; page?: number; limit?: number }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { mobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          branches: {
            include: {
              branch: true,
            },
          },
        },
      }),
    ]);

    const sanitizedUsers = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return {
        ...rest,
        roles: u.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
        branches: u.branches.map((b) => ({ id: b.branch.id, name: b.branch.name, code: b.branch.code })),
      };
    });

    return {
      data: sanitizedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        branches: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        permissions: r.role.permissions.map((p) => p.permission.code),
      })),
      branches: user.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
        code: b.branch.code,
      })),
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        mobile: dto.mobile || null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        isActive: dto.isActive ?? true,
        roles: {
          create: dto.roleIds.map((roleId) => ({ roleId })),
        },
        branches: dto.branchIds
          ? {
              create: dto.branchIds.map((branchId) => ({ branchId })),
            }
          : undefined,
      },
    });

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const data: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      isActive: dto.isActive,
    };

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email already in use');
      data.email = dto.email;
    }

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      data.roles = {
        create: dto.roleIds.map((roleId) => ({ roleId })),
      };
    }

    if (dto.branchIds) {
      await this.prisma.branchMembership.deleteMany({ where: { userId: id } });
      data.branches = {
        create: dto.branchIds.map((branchId) => ({ branchId })),
      };
    }

    await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    // Soft-deactivate user rather than hard delete to preserve audit relations
    return this.update(id, { isActive: false });
  }
}
