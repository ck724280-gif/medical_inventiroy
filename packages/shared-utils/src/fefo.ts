import { Batch, BatchStatus } from '@medical-inventory/shared-types';
import { isBatchExpired } from './date.js';

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  sellingPrice: number;
  taxPercent: number;
  allocatedQty: number;
  availableBefore: number;
}

export interface FefoResult {
  allocations: BatchAllocation[];
  allocatedTotal: number;
  unsatisfiedQty: number;
  isFullySatisfied: boolean;
}

/**
 * Sorts batches by First Expiry First Out (FEFO) and allocates required quantity.
 */
export function allocateBatchesFefo(
  batches: Batch[],
  requestedQty: number
): FefoResult {
  if (requestedQty <= 0) {
    return {
      allocations: [],
      allocatedTotal: 0,
      unsatisfiedQty: 0,
      isFullySatisfied: true,
    };
  }

  // Filter only active, non-expired batches with available stock
  const validBatches = batches.filter((b) => {
    if (b.status !== BatchStatus.ACTIVE) return false;
    if (isBatchExpired(b.expiryDate)) return false;
    const available = b.currentQty - (b.reservedQty || 0);
    return available > 0;
  });

  // Sort strictly by earliest expiry date first (ascending)
  validBatches.sort((a, b) => {
    const dateA = new Date(a.expiryDate).getTime();
    const dateB = new Date(b.expiryDate).getTime();
    return dateA - dateB;
  });

  let remaining = requestedQty;
  const allocations: BatchAllocation[] = [];

  for (const batch of validBatches) {
    if (remaining <= 0) break;

    const available = batch.currentQty - (batch.reservedQty || 0);
    const allocate = Math.min(available, remaining);

    if (allocate > 0) {
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        sellingPrice: batch.sellingPrice,
        taxPercent: batch.taxPercent,
        allocatedQty: allocate,
        availableBefore: available,
      });
      remaining -= allocate;
    }
  }

  const allocatedTotal = requestedQty - remaining;

  return {
    allocations,
    allocatedTotal,
    unsatisfiedQty: remaining,
    isFullySatisfied: remaining === 0,
  };
}
