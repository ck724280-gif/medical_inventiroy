import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundToDecimals, calculateLineTotal } from '../../packages/shared-utils/src/currency.js';
import { PaymentMode } from '@medical-inventory/shared-types';

export function runMultiTenderSplitPaymentTests() {
  describe('Tier 4 - Multi-Tender Split Payment Real-World Scenario', () => {
    it('should accurately process complex 3-way split payment (Cash + UPI + Card) with invoice discount', () => {
      // Scenario: Customer buys:
      // Item 1: 5 strips @ 120.00 each, 5% disc, 12% GST
      // Item 2: 2 bottles @ 350.00 each, 0% disc, 18% GST
      // Plus 2% invoice-level discount on final bill

      const line1 = calculateLineTotal(5, 120.0, 5, 12);
      // Line 1: subtotal 600, disc 30, taxable 570, tax 68.4, total 638.40
      assert.strictEqual(line1.subtotal, 600.0);
      assert.strictEqual(line1.discountAmount, 30.0);
      assert.strictEqual(line1.taxableAmount, 570.0);
      assert.strictEqual(line1.taxAmount, 68.4);
      assert.strictEqual(line1.total, 638.4);

      const line2 = calculateLineTotal(2, 350.0, 0, 18);
      // Line 2: subtotal 700, disc 0, taxable 700, tax 126, total 826.00
      assert.strictEqual(line2.subtotal, 700.0);
      assert.strictEqual(line2.discountAmount, 0.0);
      assert.strictEqual(line2.taxableAmount, 700.0);
      assert.strictEqual(line2.taxAmount, 126.0);
      assert.strictEqual(line2.total, 826.0);

      const rawGrandTotal = roundToDecimals(line1.total + line2.total, 2); // 1464.40
      assert.strictEqual(rawGrandTotal, 1464.4);

      // 2% invoice discount
      const invDiscount = roundToDecimals((rawGrandTotal * 2) / 100, 2); // 29.29
      const finalPayable = roundToDecimals(rawGrandTotal - invDiscount, 2); // 1435.11

      assert.strictEqual(invDiscount, 29.29);
      assert.strictEqual(finalPayable, 1435.11);

      // Multi-tender split payment:
      // Cash: 435.11, UPI: 500.00, Card: 500.00
      const splitPayments = [
        { mode: PaymentMode.CASH, amount: 435.11 },
        { mode: PaymentMode.UPI, amount: 500.0 },
        { mode: PaymentMode.CARD, amount: 500.0 },
      ];

      const totalTendered = roundToDecimals(
        splitPayments.reduce((sum, p) => sum + p.amount, 0),
        2
      );

      assert.strictEqual(totalTendered, finalPayable);

      // Verify payment mode aggregation map
      const modeBreakdown: Record<string, number> = {};
      for (const p of splitPayments) {
        modeBreakdown[p.mode] = roundToDecimals((modeBreakdown[p.mode] || 0) + p.amount, 2);
      }

      assert.strictEqual(modeBreakdown[PaymentMode.CASH], 435.11);
      assert.strictEqual(modeBreakdown[PaymentMode.UPI], 500.0);
      assert.strictEqual(modeBreakdown[PaymentMode.CARD], 500.0);
    });
  });
}
