import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateBatchesFefo } from '../../packages/shared-utils/src/fefo.js';
import { BatchStatus, Batch } from '@medical-inventory/shared-types';

export function runFefoFeatureTests() {
  describe('Tier 1 - FEFO Allocation Engine (Feature Coverage)', () => {
    const today = new Date();
    const future1 = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000); // +10 days
    const future2 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    const future3 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
    const past = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // -5 days (expired)

    it('should allocate earliest-expiring active batch first (expiryDate: asc)', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-later',
          batchNumber: 'B-OCT',
          expiryDate: future2,
          currentQty: 50,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 100,
          taxPercent: 12,
        },
        {
          id: 'batch-earlier',
          batchNumber: 'B-SEP',
          expiryDate: future1,
          currentQty: 20,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 100,
          taxPercent: 12,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 15);

      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocatedTotal, 15);
      assert.strictEqual(result.unsatisfiedQty, 0);
      assert.strictEqual(result.allocations.length, 1);
      assert.strictEqual(result.allocations[0]?.batchId, 'batch-earlier');
      assert.strictEqual(result.allocations[0]?.allocatedQty, 15);
    });

    it('should split quantity across multiple batches when requested quantity exceeds single batch stock', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-1',
          batchNumber: 'B001',
          expiryDate: future1,
          currentQty: 10,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 18,
        },
        {
          id: 'batch-2',
          batchNumber: 'B002',
          expiryDate: future2,
          currentQty: 20,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 18,
        },
        {
          id: 'batch-3',
          batchNumber: 'B003',
          expiryDate: future3,
          currentQty: 50,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 18,
        },
      ];

      // Request 25 units: 10 from B001 (all), 15 from B002
      const result = allocateBatchesFefo(batches as Batch[], 25);

      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocatedTotal, 25);
      assert.strictEqual(result.unsatisfiedQty, 0);
      assert.strictEqual(result.allocations.length, 2);

      assert.strictEqual(result.allocations[0]?.batchId, 'batch-1');
      assert.strictEqual(result.allocations[0]?.allocatedQty, 10);

      assert.strictEqual(result.allocations[1]?.batchId, 'batch-2');
      assert.strictEqual(result.allocations[1]?.allocatedQty, 15);
    });

    it('should strictly exclude expired batches from allocation', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-expired',
          batchNumber: 'B-EXP',
          expiryDate: past,
          currentQty: 100,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 20,
          taxPercent: 5,
        },
        {
          id: 'batch-valid',
          batchNumber: 'B-VAL',
          expiryDate: future1,
          currentQty: 15,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 20,
          taxPercent: 5,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 10);

      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocatedTotal, 10);
      assert.strictEqual(result.allocations.length, 1);
      assert.strictEqual(result.allocations[0]?.batchId, 'batch-valid');
      assert.strictEqual(result.allocations[0]?.batchNumber, 'B-VAL');
    });

    it('should strictly exclude non-ACTIVE batches (QUARANTINED, BLOCKED, RECALLED)', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-quarantine',
          batchNumber: 'B-QUA',
          expiryDate: future1,
          currentQty: 100,
          reservedQty: 0,
          status: BatchStatus.QUARANTINED,
          sellingPrice: 50,
          taxPercent: 12,
        },
        {
          id: 'batch-blocked',
          batchNumber: 'B-BLK',
          expiryDate: future1,
          currentQty: 100,
          reservedQty: 0,
          status: BatchStatus.BLOCKED,
          sellingPrice: 50,
          taxPercent: 12,
        },
        {
          id: 'batch-active',
          batchNumber: 'B-ACT',
          expiryDate: future2,
          currentQty: 30,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 50,
          taxPercent: 12,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 20);

      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocations.length, 1);
      assert.strictEqual(result.allocations[0]?.batchId, 'batch-active');
    });

    it('should accurately handle reserved quantities (available = currentQty - reservedQty)', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-reserved',
          batchNumber: 'B-RES',
          expiryDate: future1,
          currentQty: 50,
          reservedQty: 40, // only 10 available
          status: BatchStatus.ACTIVE,
          sellingPrice: 75,
          taxPercent: 12,
        },
        {
          id: 'batch-next',
          batchNumber: 'B-NXT',
          expiryDate: future2,
          currentQty: 20,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 75,
          taxPercent: 12,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 25);

      assert.strictEqual(result.isFullySatisfied, true);
      assert.strictEqual(result.allocatedTotal, 25);
      assert.strictEqual(result.allocations.length, 2);
      assert.strictEqual(result.allocations[0]?.allocatedQty, 10);
      assert.strictEqual(result.allocations[1]?.allocatedQty, 15);
    });

    it('should report unsatisfied quantity when stock is insufficient', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-small',
          batchNumber: 'B-SML',
          expiryDate: future1,
          currentQty: 8,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 10,
          taxPercent: 0,
        },
      ];

      const result = allocateBatchesFefo(batches as Batch[], 20);

      assert.strictEqual(result.isFullySatisfied, false);
      assert.strictEqual(result.allocatedTotal, 8);
      assert.strictEqual(result.unsatisfiedQty, 12);
    });

    it('should return empty allocation for requestedQty <= 0', () => {
      const batches: Partial<Batch>[] = [
        {
          id: 'batch-1',
          batchNumber: 'B001',
          expiryDate: future1,
          currentQty: 50,
          reservedQty: 0,
          status: BatchStatus.ACTIVE,
          sellingPrice: 10,
          taxPercent: 0,
        },
      ];

      const resultZero = allocateBatchesFefo(batches as Batch[], 0);
      assert.strictEqual(resultZero.isFullySatisfied, true);
      assert.strictEqual(resultZero.allocatedTotal, 0);
      assert.strictEqual(resultZero.allocations.length, 0);

      const resultNegative = allocateBatchesFefo(batches as Batch[], -5);
      assert.strictEqual(resultNegative.isFullySatisfied, true);
      assert.strictEqual(resultNegative.allocatedTotal, 0);
      assert.strictEqual(resultNegative.allocations.length, 0);
    });
  });
}
