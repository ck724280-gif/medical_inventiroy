import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInvoiceNumber,
  formatPurchaseNumber,
  formatReturnNumber,
} from '../../packages/shared-utils/src/invoice-number.js';
import {
  formatDate,
  formatDateTime,
  getDaysUntilExpiry,
  isBatchExpired,
  evaluateBatchStatus,
} from '../../packages/shared-utils/src/date.js';
import { BatchStatus } from '@medical-inventory/shared-types';

export function runSequencersDateFeatureTests() {
  describe('Tier 1 - Sequencers & Date Formatting (Feature Coverage)', () => {
    it('should format sequential invoice numbers with standard prefix and zero-padding', () => {
      assert.strictEqual(formatInvoiceNumber('INV', 1, 6), 'INV-000001');
      assert.strictEqual(formatInvoiceNumber('BLR-INV', 42, 6), 'BLR-INV-000042');
      assert.strictEqual(formatInvoiceNumber('INV-', 999, 5), 'INV-00999');
    });

    it('should format purchase and return sequence numbers correctly', () => {
      assert.strictEqual(formatPurchaseNumber('PUR', 12, 6), 'PUR-000012');
      assert.strictEqual(formatReturnNumber('RET-S', 5, 6), 'RET-S-000005');
    });

    it('should format dates to standard Indian format (DD-MM-YYYY) and MM-YYYY for batch expiry', () => {
      const sampleDate = new Date(2026, 7, 19); // 19 Aug 2026
      assert.strictEqual(formatDate(sampleDate, 'DD-MM-YYYY'), '19-08-2026');
      assert.strictEqual(formatDate(sampleDate, 'MM-YYYY'), '08-2026');
      assert.strictEqual(formatDate(sampleDate, 'YYYY-MM-DD'), '2026-08-19');
    });

    it('should compute days until expiry and correctly identify expired batches', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      assert.strictEqual(getDaysUntilExpiry(futureDate) >= 14, true);
      assert.strictEqual(isBatchExpired(futureDate), false);

      assert.strictEqual(getDaysUntilExpiry(pastDate) < 0, true);
      assert.strictEqual(isBatchExpired(pastDate), true);
    });

    it('should evaluate batch status dynamically based on expiry date', () => {
      const past = new Date(Date.now() - 86400000 * 5);
      const future = new Date(Date.now() + 86400000 * 30);

      assert.strictEqual(evaluateBatchStatus(past, BatchStatus.ACTIVE), BatchStatus.EXPIRED);
      assert.strictEqual(evaluateBatchStatus(future, BatchStatus.ACTIVE), BatchStatus.ACTIVE);
      assert.strictEqual(evaluateBatchStatus(future, BatchStatus.QUARANTINED), BatchStatus.QUARANTINED);
      assert.strictEqual(evaluateBatchStatus(future, BatchStatus.BLOCKED), BatchStatus.BLOCKED);
    });
  });
}
