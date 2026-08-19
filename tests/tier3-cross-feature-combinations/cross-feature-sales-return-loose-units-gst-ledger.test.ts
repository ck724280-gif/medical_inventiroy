import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseUnits, calculateLooseUnitPrice, MedicineUnitDefinition } from '../tier1-feature-coverage/r3-unit-conversion.test.js';
import { computeGstBreakdown } from '../tier1-feature-coverage/r5-gst-returns.test.js';

export function runCrossFeatureSalesReturnWorkflowTests() {
  describe('Tier 3 - Cross-Feature Combination: Sales Return -> Loose Units Restock -> GST Reversal -> Ledger Adjustment', () => {
    it('T3-CF-3: should process partial return of loose tablets, reverse proportional GST, and restock inventory', () => {
      const config: MedicineUnitDefinition = {
        primaryUnit: 'Box',
        secondaryUnit: 'Strip',
        tertiaryUnit: 'Tablet',
        conversionPrimaryToSecondary: 10,
        conversionSecondaryToTertiary: 10,
      };

      const boxMrp = 300.0;
      const looseTabletPrice = calculateLooseUnitPrice(boxMrp, 'TERTIARY', config);
      const returnedLooseCount = 3;
      const returnedBaseUnits = calculateBaseUnits(returnedLooseCount, 'TERTIARY', config);
      assert.strictEqual(returnedBaseUnits, 3);

      const refundTaxable = returnedLooseCount * looseTabletPrice;
      assert.strictEqual(refundTaxable, 9.0);

      const gstReversal = computeGstBreakdown(-refundTaxable, 12, false);
      assert.strictEqual(gstReversal.cgst, -0.54);
      assert.strictEqual(gstReversal.sgst, -0.54);
      assert.strictEqual(gstReversal.totalTax, -1.08);

      const netRefundAmount = refundTaxable + Math.abs(gstReversal.totalTax);
      assert.strictEqual(netRefundAmount, 10.08);

      let batchStock = 45;
      batchStock += returnedBaseUnits;
      assert.strictEqual(batchStock, 48);

      let customerBalance = 150.0;
      customerBalance -= netRefundAmount;
      assert.strictEqual(Math.round(customerBalance * 100) / 100, 139.92);
    });
  });
}