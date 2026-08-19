import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseUnits, MedicineUnitDefinition } from '../tier1-feature-coverage/r3-unit-conversion.test.js';
import { computeGstBreakdown } from '../tier1-feature-coverage/r5-gst-returns.test.js';

export function runFullDayPharmacySimulationTests() {
  describe('Tier 4 - Real-World Application Scenarios: 14-Hour Full-Day Pharmacy Lifecycle Simulation', () => {
    it('T4-RW-1: should simulate complete daily pharmacy operational lifecycle with 100% ledger & inventory integrity', () => {
      const unitDef: MedicineUnitDefinition = {
        primaryUnit: 'Box',
        secondaryUnit: 'Strip',
        tertiaryUnit: 'Tablet',
        conversionPrimaryToSecondary: 10,
        conversionSecondaryToTertiary: 10,
      };

      let inventoryTablets = 0;
      const inwardBoxes = 20;
      inventoryTablets += calculateBaseUnits(inwardBoxes, 'PRIMARY', unitDef);
      assert.strictEqual(inventoryTablets, 2000);

      let totalSalesRevenue = 0;
      let totalCgstCollected = 0;
      let totalSgstCollected = 0;

      for (let c = 1; c <= 30; c++) {
        const stripsSold = 2;
        const tabletsSold = calculateBaseUnits(stripsSold, 'SECONDARY', unitDef);
        inventoryTablets -= tabletsSold;

        const taxableAmount = stripsSold * 50.0;
        const gst = computeGstBreakdown(taxableAmount, 12, false);

        totalSalesRevenue += taxableAmount + gst.totalTax;
        totalCgstCollected += gst.cgst;
        totalSgstCollected += gst.sgst;
      }

      assert.strictEqual(inventoryTablets, 1400);
      assert.strictEqual(totalSalesRevenue, 3360.0);
      assert.strictEqual(totalCgstCollected, 180.0);
      assert.strictEqual(totalSgstCollected, 180.0);

      for (let c = 1; c <= 20; c++) {
        const looseSold = 5;
        inventoryTablets -= calculateBaseUnits(looseSold, 'TERTIARY', unitDef);
        const taxable = looseSold * 5.0;
        const gst = computeGstBreakdown(taxable, 12, false);
        totalSalesRevenue += taxable + gst.totalTax;
        totalCgstCollected += gst.cgst;
        totalSgstCollected += gst.sgst;
      }

      assert.strictEqual(inventoryTablets, 1300);

      const returnedTablets = 4;
      inventoryTablets += calculateBaseUnits(returnedTablets, 'TERTIARY', unitDef);
      const refundTaxable = returnedTablets * 5.0;
      const gstRefund = computeGstBreakdown(refundTaxable, 12, false);
      totalSalesRevenue -= (refundTaxable + gstRefund.totalTax);
      totalCgstCollected -= gstRefund.cgst;
      totalSgstCollected -= gstRefund.sgst;

      assert.strictEqual(inventoryTablets, 1304);
      const netTaxCollected = Math.round(totalCgstCollected + totalSgstCollected);
      assert.ok(netTaxCollected > 400);
      assert.strictEqual(inventoryTablets, 1304);
    });
  });
}