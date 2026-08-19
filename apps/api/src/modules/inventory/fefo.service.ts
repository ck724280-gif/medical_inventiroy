import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { allocateBatchesFefo, FefoResult } from '@medical-inventory/shared-utils';
import { Batch, BatchStatus } from '@medical-inventory/shared-types';

@Injectable()
export class FefoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetches valid batches for a medicine at a specific branch and performs FEFO allocation.
   */
  async allocateBatchesForSale(
    medicineId: string,
    branchId: string,
    requestedQty: number
  ): Promise<FefoResult> {
    const now = new Date();

    // Fetch active batches with positive stock, sorted by earliest expiry
    const batches = await this.prisma.batch.findMany({
      where: {
        medicineId,
        branchId,
        status: BatchStatus.ACTIVE,
        expiryDate: { gt: now },
        currentQty: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const typedBatches: Batch[] = batches.map((b) => ({
      ...b,
      status: b.status as BatchStatus,
    }));

    return allocateBatchesFefo(typedBatches, requestedQty);
  }
}
