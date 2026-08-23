import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const ALLOWED_FEATURE_KEYS = [
  'POS',
  'CREDIT_SALE',
  'WHOLESALE',
  'STOCK_TRANSFER',
  'EXPENSE',
  'CENTRAL_PURCHASE',
  'REPORTS',
  'IMPORT_EXPORT',
  'PURCHASE_ORDERS',
  'SALES_RETURNS',
  'PURCHASE_RETURNS',
  'CUSTOMER_CREDIT',
  'DISCOUNT_APPROVAL',
] as const;

export type FeatureKey = (typeof ALLOWED_FEATURE_KEYS)[number];

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all feature flags for a branch (§20) */
  async getBranchFlags(branchId: string): Promise<Record<string, boolean>> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found.');

    const existing = await this.prisma.branchFeatureFlag.findMany({ where: { branchId } });

    // Build result map: if flag not set, default to true
    const result: Record<string, boolean> = {};
    for (const key of ALLOWED_FEATURE_KEYS) {
      const flag = existing.find((f) => f.featureKey === key);
      result[key] = flag ? flag.isEnabled : true; // default ON
    }
    return result;
  }

  /** Set a single feature flag for a branch (§20, §44 backend enforcement) */
  async setFlag(
    branchId: string,
    featureKey: string,
    isEnabled: boolean,
    updatedBy: string,
  ) {
    if (!ALLOWED_FEATURE_KEYS.includes(featureKey as FeatureKey)) {
      throw new BadRequestException(`Invalid feature key: ${featureKey}`);
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found.');

    const flag = await this.prisma.branchFeatureFlag.upsert({
      where: { branchId_featureKey: { branchId, featureKey } },
      create: { branchId, featureKey, isEnabled, updatedBy },
      update: { isEnabled, updatedBy },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'FEATURE_FLAG_CHANGED',
        entity: 'BranchFeatureFlag',
        entityId: flag.id,
        newValue: JSON.stringify({ branchId, featureKey, isEnabled }),
      },
    });

    return flag;
  }

  /** Bulk update multiple flags for a branch (§20) */
  async bulkSetFlags(
    branchId: string,
    flags: Record<string, boolean>,
    updatedBy: string,
  ) {
    const results: any[] = [];
    for (const [key, value] of Object.entries(flags)) {
      const result = await this.setFlag(branchId, key, value, updatedBy);
      results.push(result);
    }
    return results;
  }

  /**
   * Check if a specific feature is enabled for a branch (§20).
   * Used by backend guards to enforce feature restrictions server-side.
   */
  async isFeatureEnabled(branchId: string, featureKey: string): Promise<boolean> {
    const flag = await this.prisma.branchFeatureFlag.findUnique({
      where: { branchId_featureKey: { branchId, featureKey } },
    });
    return flag ? flag.isEnabled : true; // default enabled if not explicitly disabled
  }

  /** Get feature flags for all branches (Super Admin view) (§85) */
  async getAllBranchesFlags() {
    const branches = await this.prisma.branch.findMany({
      select: { id: true, name: true, code: true },
    });

    const result = [];
    for (const branch of branches) {
      const flags = await this.getBranchFlags(branch.id);
      result.push({ branch, flags });
    }
    return result;
  }
}
