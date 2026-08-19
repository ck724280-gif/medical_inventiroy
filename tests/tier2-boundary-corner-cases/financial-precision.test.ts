import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundToDecimals, calculateLineTotal } from '../../packages/shared-utils/src/currency.js';

export function runFinancialPrecisionTests() {
  describe('Tier 2 - Financial Precision & Rounding Edge Cases', () => {
    it('should eliminate classic IEEE-754 floating point drift across multiple operations', () => {
      // 0.7 + 0.1 = 0.7999999999999999 in raw float
      const driftVal = 0.7 + 0.1;
      assert.strictEqual(roundToDecimals(driftVal, 2), 0.8);

      // 1.05 rounding test
      assert.strictEqual(roundToDecimals(1.05, 1), 1.1);

      // Sum of many fractional amounts
      let accumulated = 0;
      for (let i = 0; i < 100; i++) {
        accumulated += 0.07;
      }
      // accumulated is ~7.00000000000001
      assert.strictEqual(roundToDecimals(accumulated, 2), 7.0);
    });

    it('should correctly compute 100% promotional discount (free sample)', () => {
      const line = calculateLineTotal(10, 250.0, 100, 18);
      assert.strictEqual(line.subtotal, 2500.0);
      assert.strictEqual(line.discountAmount, 2500.0);
      assert.strictEqual(line.taxableAmount, 0.0);
      assert.strictEqual(line.taxAmount, 0.0);
      assert.strictEqual(line.total, 0.0);
    });

    it('should correctly calculate fractional tax rates and sub-cent precision', () => {
      // e.g. 5% GST on Rs. 33.33 for 3 units
      const line = calculateLineTotal(3, 33.33, 0, 5);
      assert.strictEqual(line.subtotal, 99.99);
      assert.strictEqual(line.discountAmount, 0);
      assert.strictEqual(line.taxableAmount, 99.99);
      // 99.99 * 0.05 = 4.9995 => rounds to 5.00
      assert.strictEqual(line.taxAmount, 5.0);
      assert.strictEqual(line.total, 104.99);
    });

    it('should handle multi-tender split payment sum validation', () => {
      const grandTotal = 1542.75;
      const payments = [
        { mode: 'CASH', amount: 542.75 },
        { mode: 'UPI', amount: 1000.0 },
      ];

      const sumPaid = roundToDecimals(payments.reduce((sum, p) => sum + p.amount, 0), 2);
      assert.strictEqual(sumPaid, grandTotal);
      assert.strictEqual(sumPaid >= grandTotal, true);
    });

    it('should compute accurate cash change return without precision loss', () => {
      const billAmount = 348.65;
      const cashTendered = 500.0;
      const changeDue = roundToDecimals(cashTendered - billAmount, 2);

      assert.strictEqual(changeDue, 151.35);
    });
  });
}
