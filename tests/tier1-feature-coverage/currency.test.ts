import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToDecimals,
  calculateLineTotal,
  formatCurrency,
} from '../../packages/shared-utils/src/currency.js';

export function runCurrencyFeatureTests() {
  describe('Tier 1 - Currency & Precision Math (Feature Coverage)', () => {
    it('should round numbers to specified decimal places without floating-point drift', () => {
      // 0.1 + 0.2 is 0.30000000000000004 in native JS IEEE-754
      const sum = 0.1 + 0.2;
      assert.notStrictEqual(sum, 0.3); // Demonstrates native float drift
      assert.strictEqual(roundToDecimals(sum, 2), 0.3);

      // Financial sub-cent rounding
      assert.strictEqual(roundToDecimals(12.3456, 2), 12.35);
      assert.strictEqual(roundToDecimals(12.3444, 2), 12.34);
      assert.strictEqual(roundToDecimals(10.005, 2), 10.01);
    });

    it('should accurately calculate line total with discount and GST tax', () => {
      // 10 units @ 150.00 each = 1500 subtotal
      // 10% discount = 150 discount => 1350 taxable amount
      // 18% GST = 1350 * 0.18 = 243 tax => total = 1593.00
      const line = calculateLineTotal(10, 150, 10, 18);

      assert.strictEqual(line.subtotal, 1500.0);
      assert.strictEqual(line.discountAmount, 150.0);
      assert.strictEqual(line.taxableAmount, 1350.0);
      assert.strictEqual(line.taxAmount, 243.0);
      assert.strictEqual(line.total, 1593.0);
    });

    it('should calculate zero-discount and zero-tax line items accurately', () => {
      const line = calculateLineTotal(5, 45.5, 0, 0);

      assert.strictEqual(line.subtotal, 227.5);
      assert.strictEqual(line.discountAmount, 0);
      assert.strictEqual(line.taxableAmount, 227.5);
      assert.strictEqual(line.taxAmount, 0);
      assert.strictEqual(line.total, 227.5);
    });

    it('should format currency values according to Indian Rupee standard', () => {
      const formatted1 = formatCurrency(1250.5);
      assert.ok(formatted1.includes('1,250.50') || formatted1.includes('1250.50'));
      assert.ok(formatted1.startsWith('₹'));

      const formatted2 = formatCurrency(100000);
      assert.ok(formatted2.includes('1,00,000.00') || formatted2.includes('100,000.00'));
    });
  });
}
