import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateStockTransferDto {
  fromBranchId: string;
  toBranchId: string;
  notes?: string;
  items: Array<{
    medicineId: string;
    batchId: string;
    qty: number;
    unitId?: string;
  }>;
}

@Injectable()
export class StockTransfersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId?: string, status?: string) {
    return this.prisma.stockTransfer.findMany({
      where: {
        ...(branchId
          ? {
              OR: [{ fromBranchId: branchId }, { toBranchId: branchId }],
            }
          : {}),
        ...(status ? { status } : {}),
      },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, sku: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true, mrp: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer #${id} not found.`);
    }

    return transfer;
  }

  async create(dto: CreateStockTransferDto, userId: string) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('Source and destination branch cannot be the same.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Transfer must contain at least one medicine item.');
    }

    const [fromBranch, toBranch] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.fromBranchId } }),
      this.prisma.branch.findUnique({ where: { id: dto.toBranchId } }),
    ]);

    if (!fromBranch) throw new NotFoundException('Source branch not found');
    if (!toBranch) throw new NotFoundException('Destination branch not found');

    // Verify each batch exists and has sufficient stock in fromBranch
    for (const item of dto.items) {
      if (item.qty <= 0) {
        throw new BadRequestException(`Transfer quantity must be greater than 0.`);
      }

      const batch = await this.prisma.batch.findUnique({
        where: { id: item.batchId },
      });

      if (!batch || batch.branchId !== dto.fromBranchId) {
        throw new BadRequestException(
          `Batch #${item.batchId} does not belong to source branch '${fromBranch.name}'.`
        );
      }

      if (batch.currentQty < item.qty) {
        throw new BadRequestException(
          `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.currentQty}, Requested: ${item.qty}`
        );
      }
    }

    return this.prisma.stockTransfer.create({
      data: {
        fromBranchId: dto.fromBranchId,
        toBranchId: dto.toBranchId,
        transferredByUserId: userId,
        notes: dto.notes || null,
        status: 'REQUESTED',
        items: {
          create: dto.items.map((i) => ({
            medicineId: i.medicineId,
            batchId: i.batchId,
            qty: i.qty,
            unitId: i.unitId || null,
          })),
        },
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: true,
      },
    });
  }

  /**
   * Approve transfer request: Marks transfer as APPROVED
   */
  async approve(transferId: string, userId: string) {
    const transfer = await this.findOne(transferId);

    if (transfer.status !== 'REQUESTED' && transfer.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot approve transfer with status '${transfer.status}'. Only REQUESTED or DRAFT transfers can be approved.`
      );
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'APPROVED',
        updatedAt: new Date(),
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: { medicine: true, batch: true },
        },
      },
    });
  }

  /**
   * Reject / Cancel transfer request: Marks transfer as CANCELLED
   */
  async reject(transferId: string, userId: string, reason?: string) {
    const transfer = await this.findOne(transferId);

    if (transfer.status === 'COMPLETED' || transfer.status === 'RECEIVED') {
      throw new BadRequestException(`Cannot reject transfer that is already completed.`);
    }

    // If already dispatched, we should restore source branch batch stock
    if (transfer.status === 'DISPATCHED' || transfer.status === 'IN_TRANSIT') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { increment: item.qty } },
          });

          await tx.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              batchId: item.batchId,
              branchId: transfer.fromBranchId,
              type: 'TRANSFER_IN',
              direction: 'IN',
              qty: item.qty,
              reason: `Reversal of rejected transfer #${transfer.id.slice(0, 8)}`,
              userId,
            },
          });
        }

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: 'CANCELLED',
            notes: reason ? `${transfer.notes || ''} [Rejected: ${reason}]` : transfer.notes,
            updatedAt: new Date(),
          },
          include: { fromBranch: true, toBranch: true, items: true },
        });
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${transfer.notes || ''} [Rejected: ${reason}]` : transfer.notes,
        updatedAt: new Date(),
      },
      include: { fromBranch: true, toBranch: true, items: true },
    });
  }

  /**
   * Dispatch transfer: Deducts stock from Source Branch batches and marks DISPATCHED
   */
  async dispatch(transferId: string, userId: string) {
    const transfer = await this.findOne(transferId);

    if (transfer.status !== 'REQUESTED' && transfer.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot dispatch transfer with status '${transfer.status}'. Only REQUESTED or APPROVED transfers can be dispatched.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct stock from source batches
      for (const item of transfer.items) {
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (!batch || batch.currentQty < item.qty) {
          throw new BadRequestException(
            `Insufficient stock to dispatch batch ${batch?.batchNumber || item.batchId}.`
          );
        }

        await tx.batch.update({
          where: { id: item.batchId },
          data: {
            currentQty: { decrement: item.qty },
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: item.batchId,
            branchId: transfer.fromBranchId,
            type: 'TRANSFER_OUT',
            direction: 'OUT',
            qty: item.qty,
            reason: `Inter-branch transfer dispatch to ${transfer.toBranch.name} (#${transfer.id.slice(0, 8)})`,
            userId: userId,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'DISPATCHED',
          updatedAt: new Date(),
        },
        include: {
          fromBranch: true,
          toBranch: true,
          items: {
            include: { medicine: true, batch: true },
          },
        },
      });
    });
  }

  /**
   * Receive transfer: Adds stock to Destination Branch batches and marks COMPLETED
   */
  async receive(transferId: string, userId: string) {
    const transfer = await this.findOne(transferId);

    if (transfer.status !== 'DISPATCHED' && transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(
        `Cannot receive transfer in status '${transfer.status}'. Transfer must be DISPATCHED or IN_TRANSIT first.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const sourceBatch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });

        if (!sourceBatch) {
          throw new NotFoundException(`Source batch ${item.batchId} missing.`);
        }

        // Find or create matching batch in destination branch
        let destBatch = await tx.batch.findFirst({
          where: {
            branchId: transfer.toBranchId,
            medicineId: item.medicineId,
            batchNumber: sourceBatch.batchNumber,
            status: 'ACTIVE',
          },
        });

        if (destBatch) {
          await tx.batch.update({
            where: { id: destBatch.id },
            data: {
              currentQty: { increment: item.qty },
            },
          });
        } else {
          destBatch = await tx.batch.create({
            data: {
              branchId: transfer.toBranchId,
              medicineId: item.medicineId,
              batchNumber: sourceBatch.batchNumber,
              mfgDate: sourceBatch.mfgDate,
              expiryDate: sourceBatch.expiryDate,
              initialQty: item.qty,
              currentQty: item.qty,
              purchasePrice: sourceBatch.purchasePrice,
              mrp: sourceBatch.mrp,
              sellingPrice: sourceBatch.sellingPrice,
              taxPercent: sourceBatch.taxPercent,
              status: 'ACTIVE',
            },
          });
        }

        // Record inward stock movement at destination
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: destBatch.id,
            branchId: transfer.toBranchId,
            type: 'TRANSFER_IN',
            direction: 'IN',
            qty: item.qty,
            reason: `Inter-branch transfer received from ${transfer.fromBranch.name} (#${transfer.id.slice(0, 8)})`,
            userId: userId,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          receivedByUserId: userId,
          updatedAt: new Date(),
        },
        include: {
          fromBranch: true,
          toBranch: true,
          items: {
            include: { medicine: true, batch: true },
          },
        },
      });
    });
  }
}
