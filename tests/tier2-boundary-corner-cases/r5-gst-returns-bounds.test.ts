import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeGstBreakdown } from '../tier1-feature-coverage/r5-gst-returns.test.js';

export function runR5GstReturnsBoundsTests() {
  describe('Tier 2 - R5: GST Returns Engine (Boundary & Corner Cases)', () => {
    it('R5-BND-1: should calculate zero GST for 0% tax exempt medicines', () => {
      const res = computeGstBreakdown(500.0, 0, false);
      assert.strictEqual(res.totalTax, 0);
      assert.strictEqual(res.cgst, 0);
      assert.strictEqual(res.sgst, 0);
    });

    it('R5-BND-2: should handle zero taxable amount without division-by-zero errors', () => {
      const res = computeGstBreakdown(0, 18, false);
      assert.strictEqual(res.totalTax, 0);
    });

    it('R5-BND-3: should apply Half-Up paisa rounding for odd paise taxable values', () => {
      const res = computeGstBreakdown(33.33, 12, false);
      assert.strictEqual(res.cgst, 2.0);
      assert.strictEqual(res.sgst, 2.0);
      assert.strictEqual(res.totalTax, 4.0);
    });

    it('R5-BND-4: should handle sales return negative taxable amounts and tax reversals', () => {
      const res = computeGstBreakdown(-100.0, 18, false);
      assert.strictEqual(res.cgst, -9.0);
      assert.strictEqual(res.sgst, -9.0);
      assert.strictEqual(res.totalTax, -18.0);
    });

    it('R5-BND-5: should calculate 28% maximum luxury GST slab accurately for cosmetics/supplements', () => {
      const res = computeGstBreakdown(1000.0, 28, false);
      assert.strictEqual(res.cgst, 140.0);
      assert.strictEqual(res.sgst, 140.0);
      assert.strictEqual(res.totalTax, 280.0);
    });
  });
}