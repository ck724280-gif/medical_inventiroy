import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CentralPurchaseAllocationInput {
  branchId: string;
  medicineId: string;
  allocatedQty: number;
}

@Injectable()
export class CentralPurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a central purchase and distribute to multiple branches (§3).
   * Super Admin only.
   */
  async createCentralPurchase(
    purchaseId: string,
    allocations: CentralPurchaseAllocationInput[],
    userId: string,
  ) {
    const purchase = await this.prisma.purchaseInvoice.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException('Purchase invoice not found.');

    // Validate all branches exist
    for (const alloc of allocations) {
      const branch = await this.prisma.branch.findUnique({ where: { id: alloc.branchId } });
      if (!branch) throw new NotFoundException(`Branch ${alloc.branchId} not found.`);
      if (alloc.allocatedQty <= 0) {
        throw new BadRequestException('Allocated quantity must be greater than 0.');
      }
    }

    // Create allocation records
    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const alloc of allocations) {
        const record = await tx.centralPurchaseAllocation.create({
          data: {
            purchaseId,
            branchId: alloc.branchId,
            medicineId: alloc.medicineId,
            allocatedQty: alloc.allocatedQty,
            receivedQty: 0,
          },
        });
        results.push(record);
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CENTRAL_PURCHASE_ALLOCATED',
          entity: 'PurchaseInvoice',
          entityId: purchaseId,
          newValue: JSON.stringify({ allocations, totalBranches: allocations.length }),
        },
      });

      return results;
    });

    return created;
  }

  /**
   * Receive central purchase allocation at a branch (§3).
   * Branch Manager marks receipt — triggers StockMovement IN.
   */
  async receiveAllocation(allocationId: string, receivedQty: number, userId: string) {
    const alloc = await this.prisma.centralPurchaseAllocation.findUnique({
      where: { id: allocationId },
      include: { branch: true, medicine: true, purchase: true },
    });
    if (!alloc) throw new NotFoundException('Allocation not found.');
    if (receivedQty > alloc.allocatedQty) {
      throw new BadRequestException(
        `Received qty (${receivedQty}) cannot exceed allocated qty (${alloc.allocatedQty}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update allocation
      const updated = await tx.centralPurchaseAllocation.update({
        where: { id: allocationId },
        data: { receivedQty },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CENTRAL_PURCHASE_RECEIVED',
          entity: 'CentralPurchaseAllocation',
          entityId: allocationId,
          newValue: JSON.stringify({ receivedQty, branchId: alloc.branchId }),
        },
      });

      return updated;
    });
  }

  /** List allocations for a purchase (§3) */
  async getAllocationsForPurchase(purchaseId: string) {
    return this.prisma.centralPurchaseAllocation.findMany({
      where: { purchaseId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        medicine: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  /** List allocations for a branch (§3) */
  async getAllocationsForBranch(branchId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { branchId };
    const [total, items] = await Promise.all([
      this.prisma.centralPurchaseAllocation.count({ where }),
      this.prisma.centralPurchaseAllocation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: { select: { id: true, name: true, sku: true } },
          purchase: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        },
      }),
    ]);
    return { total, page, limit, items };
  }
}
