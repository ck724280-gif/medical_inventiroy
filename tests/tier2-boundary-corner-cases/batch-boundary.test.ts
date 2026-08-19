import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateBatchesFefo } from '../../packages/shared-utils/src/fefo.js';
import { isBatchExpired, evaluateBatchStatus } from '../../packages/shared-utils/src/date.js';
import { BatchStatus, Batch } from '@medical-inventory/shared-types';

export function runBatchBoundaryTests() {
  describe('Tier 2 - Batch & FEFO Boundary Cases', () => {
    it('should handle exact 0 stock batches without error or allocation', () => {
      const future = new Date(Date.now() + 86400000 * 30);
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-zero',
          batchNumber: 'B-ZERO',
          expiryDate: future,
          currentQty: 0,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 5,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 5);
      assert.strictEqual(result.isFullySatisfied, false);
      assert.strictEqual(result.allocatedTotal, 0);
      assert.strictEqual(result.unsatisfiedQty, 5);
      assert.strictEqual(result.allocations.length, 0);
    });

    it('should handle batches where reservedQty exactly equals currentQty', () => {
      const future = new Date(Date.now() + 86400000 * 30);
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-fully-reserved',
          batchNumber: 'B-RES-ALL',
          expiryDate: future,
          currentQty: 25,
          reservedQty: 25, // 0 available
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 5,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 10);
      assert.strictEqual(result.isFullySatisfied, false);
      assert.strictEqual(result.allocatedTotal, 0);
      assert.strictEqual(result.unsatisfiedQty, 10);
    });

    it('should fulfill order when requested quantity exactly matches total available stock across multiple batches', () => {
      const future1 = new Date(Date.now() + 86400000 * 10);
      const future2 = new Date(Date.now() + 86400000 * 20);
      const batches: Partial<Batch>[] = [
        {
          id: 'b1',
          batchNumber: 'B1',
          expiryDate: future1,
          currentQty: 13,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 100,
          taxPercent: 12,
        },
        {
          id: 'b2',
          batchNumber: 'B2',
          expiryDate: future2,
          currentQty: 17,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 100,
          taxPercent: 12,
        },
      ];

      // Exact sum = 13 + 17 = 30
      const result = allocateBatchesFefo(batches as Batch[], 30);
      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocatedTotal, 30);
      assert.strictEqual(result.unsatisfiedQty, 0);
      assert.strictEqual(result.allocations.length, 2);
      assert.strictEqual(result.allocations[0]?.allocatedQty, 13);
      assert.strictEqual(result.allocations[1]?.allocatedQty, 17);
    });

    it('should detect when requested quantity exceeds total stock by exactly 1 unit', () => {
      const future1 = new Date(Date.now() + 86400000 * 10);
      const batches: Partial<Batch>[] = [
        {
          id: 'b1',
          batchNumber: 'B1',
          expiryDate: future1,
          currentQty: 9,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 10,
          taxPercent: 0,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 10);
      assert.strictEqual(result.isFullySatisfied, false);
      assert.strictEqual(result.allocatedTotal, 9);
      assert.strictEqual(result.unsatisfiedQty, 1);
    });

    it('should accurately test boundary dates for batch expiry', () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const yesterdayEnd = new Date(todayStart.getTime() - 1000); // 23:59:59 yesterday
      const tomorrowStart = new Date(todayStart.getTime() + 86400000);

      // Yesterday is expired
      assert.strictEqual(isBatchExpired(yesterdayEnd), true);
      assert.strictEqual(evaluateBatchStatus(yesterdayEnd, BatchStatus.ACTIVE), BatchStatus.EXPIRED);

      // Tomorrow is NOT expired
      assert.strictEqual(isBatchExpired(tomorrowStart), false);
      assert.strictEqual(evaluateBatchStatus(tomorrowStart, BatchStatus.ACTIVE), BatchStatus.ACTIVE);
    });
  });
}
