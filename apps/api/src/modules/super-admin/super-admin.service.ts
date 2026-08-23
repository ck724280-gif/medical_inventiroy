import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService
  ) {}

  /**
   * Get consolidated organization-level KPIs
   */
  async getOrganizationOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      branches,
      totalUsers,
      totalCustomers,
      totalSuppliers,
      totalMedicines,
      salesStats,
      todaySalesStats,
      purchasesStats,
      expensesStats,
      batches,
    ] = await Promise.all([
      this.prisma.branch.findMany({
        include: {
          _count: {
            select: {
              memberships: true,
              batches: true,
              sales: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.salesInvoice.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.salesInvoice.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchaseInvoice.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.batch.findMany({
        where: { status: 'ACTIVE', currentQty: { gt: 0 } },
        select: { currentQty: true, purchasePrice: true, mrp: true },
      }),
    ]);

    const totalStockValue = batches.reduce(
      (sum, b) => sum + (b.currentQty || 0) * (b.purchasePrice || 0),
      0
    );

    const totalRetailStockValue = batches.reduce(
      (sum, b) => sum + (b.currentQty || 0) * (b.mrp || 0),
      0
    );

    const activeBranches = branches.filter((b) => b.isActive).length;

    return {
      totalBranches: branches.length,
      activeBranches,
      maxBranchesAllowed: 50,
      totalStaff: totalUsers,
      totalCustomers,
      totalSuppliers,
      totalMedicines,
      sales: {
        totalRevenue: salesStats._sum.totalAmount || 0,
        totalInvoices: salesStats._count.id || 0,
        todayRevenue: todaySalesStats._sum.totalAmount || 0,
        todayInvoices: todaySalesStats._count.id || 0,
      },
      purchases: {
        totalSpent: purchasesStats._sum.totalAmount || 0,
        totalBills: purchasesStats._count.id || 0,
      },
      expenses: {
        totalAmount: expensesStats._sum.amount || 0,
        totalVouchers: expensesStats._count.id || 0,
      },
      inventory: {
        totalPurchaseValue: totalStockValue,
        totalRetailValue: totalRetailStockValue,
        activeBatchesCount: batches.length,
      },
    };
  }

  /**
   * Get all branches with comparative metrics
   */
  async getBranchesMatrix() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const branches = await this.prisma.branch.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
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
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const matrix = await Promise.all(
      branches.map(async (branch) => {
        const [todaySales, totalSales, totalStock] = await Promise.all([
          this.prisma.salesInvoice.aggregate({
            where: { branchId: branch.id, createdAt: { gte: todayStart } },
            _sum: { totalAmount: true },
            _count: { id: true },
          }),
          this.prisma.salesInvoice.aggregate({
            where: { branchId: branch.id },
            _sum: { totalAmount: true },
            _count: { id: true },
          }),
          this.prisma.batch.findMany({
            where: { branchId: branch.id, status: 'ACTIVE', currentQty: { gt: 0 } },
            select: { currentQty: true, purchasePrice: true },
          }),
        ]);

        const stockValue = totalStock.reduce(
          (sum, b) => sum + (b.currentQty || 0) * (b.purchasePrice || 0),
          0
        );

        // Find manager if any
        const managerMembership = branch.memberships.find((m) =>
          m.user?.roles?.some(
            (ur) =>
              ur.role?.name?.toUpperCase() === 'SUPER_ADMIN' ||
              ur.role?.name?.toUpperCase() === 'BRANCH_MANAGER'
          )
        );

        const manager = managerMembership?.user;

        return {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          city: branch.city,
          state: branch.state,
          phone: branch.phone,
          email: branch.email,
          isActive: branch.isActive,
          isDefault: branch.isDefault,
          manager: manager
            ? {
                id: manager.id,
                name: `${manager.firstName} ${manager.lastName || ''}`.trim(),
                role: manager.roles?.[0]?.role?.name || 'Manager',
                email: manager.email,
              }
            : null,
          staffCount: branch.memberships.length,
          todaySalesAmount: todaySales._sum.totalAmount || 0,
          todayInvoicesCount: todaySales._count.id || 0,
          totalSalesAmount: totalSales._sum.totalAmount || 0,
          totalInvoicesCount: totalSales._count.id || 0,
          stockBatchesCount: totalStock.length,
          stockValue,
        };
      })
    );

    return matrix;
  }

  /**
   * Get organization staff with branch assignments
   */
  async getStaffDirectory(branchId?: string, role?: string, search?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(role
          ? {
              roles: {
                some: {
                  role: { name: { equals: role, mode: 'insensitive' } },
                },
              },
            }
          : {}),
        ...(branchId
          ? {
              branches: {
                some: { branchId },
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      mobile: u.mobile,
      role: u.roles?.[0]?.role?.name || 'User',
      isActive: u.isActive,
      primaryBranchId: u.branches?.[0]?.branchId || null,
      assignedBranches: u.branches.map((m) => ({
        branchId: m.branch.id,
        branchName: m.branch.name,
        branchCode: m.branch.code,
      })),
      createdAt: u.createdAt,
    }));
  }

  /**
   * Transfer staff member to a target branch
   */
  async transferStaff(userId: string, targetBranchId: string) {
    const [user, branch] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.branch.findUnique({ where: { id: targetBranchId } }),
    ]);

    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
    if (!branch) throw new NotFoundException(`Branch with ID ${targetBranchId} not found`);

    // Ensure branch membership exists
    const existingMembership = await this.prisma.branchMembership.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId: targetBranchId,
        },
      },
    });

    if (!existingMembership) {
      await this.prisma.branchMembership.create({
        data: {
          userId,
          branchId: targetBranchId,
        },
      });
    }

    return {
      success: true,
      message: `Staff ${user.firstName} transferred to branch ${branch.name} (${branch.code}) successfully.`,
      targetBranch: { id: branch.id, name: branch.name, code: branch.code },
    };
  }

  /**
   * Secure Super Admin Context Switcher
   */
  async switchContext(superAdminUserId: string, targetBranchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: targetBranchId },
      include: { settings: true },
    });

    if (!branch) {
      throw new NotFoundException(`Target branch ${targetBranchId} not found.`);
    }

    if (!branch.isActive) {
      throw new BadRequestException(`Cannot switch context to inactive branch '${branch.name}'.`);
    }

    return {
      success: true,
      switchedToBranch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        isDefault: branch.isDefault,
      },
      message: `Switched operational context to branch: ${branch.name} (${branch.code})`,
      timestamp: new Date().toISOString(),
    };
  }
}
