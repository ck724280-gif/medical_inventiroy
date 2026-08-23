import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Default discount limits per role (§13)
const DEFAULT_DISCOUNT_LIMITS: Record<string, number> = {
  CASHIER: 5,
  PHARMACIST: 5,
  MANAGER: 15,
  ACCOUNTANT: 10,
  INVENTORY_STAFF: 0,
  SUPER_ADMIN: 100,
};

@Injectable()
export class DiscountPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get max discount percent for a user's role at a branch (§13) */
  async getMaxDiscount(userId: string, branchId: string): Promise<{
    maxPercent: number;
    requiresApprovalAbove: number | null;
    roleName: string;
  }> {
    // Get user's highest-privilege role
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name.toUpperCase());

    // Determine effective role (highest privilege wins)
    let effectiveRole = 'CASHIER';
    if (roleNames.some((r) => r.includes('SUPER_ADMIN') || r.includes('SUPERADMIN'))) {
      effectiveRole = 'SUPER_ADMIN';
    } else if (roleNames.some((r) => r.includes('MANAGER') || r.includes('ADMIN'))) {
      effectiveRole = 'MANAGER';
    } else if (roleNames.some((r) => r.includes('PHARMACIST'))) {
      effectiveRole = 'PHARMACIST';
    } else if (roleNames.some((r) => r.includes('ACCOUNTANT'))) {
      effectiveRole = 'ACCOUNTANT';
    } else if (roleNames.some((r) => r.includes('INVENTORY'))) {
      effectiveRole = 'INVENTORY_STAFF';
    }

    // Check branch-specific override first, then org default
    const policy = await this.prisma.discountPolicy.findFirst({
      where: {
        roleName: effectiveRole,
        OR: [{ branchId }, { branchId: null }],
      },
      orderBy: { branchId: 'desc' }, // branch-specific first
    });

    const maxPercent = policy
      ? policy.maxDiscountPercent
      : (DEFAULT_DISCOUNT_LIMITS[effectiveRole] ?? 5);

    const requiresApprovalAbove = policy?.requiresApprovalAbove ?? null;

    return { maxPercent, requiresApprovalAbove, roleName: effectiveRole };
  }

  /**
   * Enforce discount limit - throws if exceeded (§13, backend-only enforcement)
   * Returns whether approval is needed
   */
  async enforceDiscount(
    userId: string,
    branchId: string,
    discountPercent: number,
  ): Promise<{ allowed: boolean; requiresApproval: boolean; maxPercent: number }> {
    const { maxPercent, requiresApprovalAbove } = await this.getMaxDiscount(userId, branchId);

    if (discountPercent > maxPercent) {
      throw new ForbiddenException(
        `Discount ${discountPercent}% exceeds maximum allowed ${maxPercent}% for your role. Request manager approval.`,
      );
    }

    const requiresApproval =
      requiresApprovalAbove !== null && discountPercent > requiresApprovalAbove;

    return { allowed: true, requiresApproval, maxPercent };
  }

  /** Get all discount policies (§13) */
  async getAllPolicies(branchId?: string) {
    return this.prisma.discountPolicy.findMany({
      where: branchId ? { OR: [{ branchId }, { branchId: null }] } : {},
      orderBy: [{ branchId: 'desc' }, { roleName: 'asc' }],
    });
  }

  /** Set discount policy for a role (§13) */
  async setPolicy(
    roleName: string,
    maxDiscountPercent: number,
    requiresApprovalAbove: number | null,
    branchId: string | null,
    updatedBy: string,
  ) {
    if (maxDiscountPercent < 0 || maxDiscountPercent > 100) {
      throw new BadRequestException('Discount percent must be between 0 and 100.');
    }

    const policy = await this.prisma.discountPolicy.upsert({
      where: { branchId_roleName: { branchId: branchId ?? '', roleName } },
      create: {
        branchId,
        roleName,
        maxDiscountPercent,
        requiresApprovalAbove,
      },
      update: {
        maxDiscountPercent,
        requiresApprovalAbove,
      },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'DISCOUNT_POLICY_UPDATED',
        entity: 'DiscountPolicy',
        entityId: policy.id,
        newValue: JSON.stringify({ roleName, maxDiscountPercent, branchId }),
      },
    });

    return policy;
  }
}
