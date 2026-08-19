import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundToDecimals } from '../../packages/shared-utils/src/currency.js';

export function runCogsGrossProfitTests() {
  describe('Tier 3 - Financial & COGS Gross Profit Accuracy (AC 4)', () => {
    it('should compute gross profit accurately from actual sold batch purchase costs (SellingPrice - BatchPurchasePrice)', () => {
      // Pharmacy Sale Scenario:
      // Item 1 sold: 10 units from Batch A (Purchase Price = Rs. 45.00, Selling Price = Rs. 70.00)
      // Item 2 sold: 5 units from Batch B (Purchase Price = Rs. 85.00, Selling Price = Rs. 130.00)
      // Item 3 sold: 2 units from Batch C (Purchase Price = Rs. 15.50, Selling Price = Rs. 25.00)

      const salesItems = [
        { qty: 10, sellingPrice: 70.0, purchasePrice: 45.0 },
        { qty: 5, sellingPrice: 130.0, purchasePrice: 85.0 },
        { qty: 2, sellingPrice: 25.0, purchasePrice: 15.5 },
      ];

      let totalRevenue = 0;
      let totalCogs = 0;

      for (const item of salesItems) {
        totalRevenue += item.qty * item.sellingPrice;
        totalCogs += item.qty * item.purchasePrice;
      }

      totalRevenue = roundToDecimals(totalRevenue, 2);
      totalCogs = roundToDecimals(totalCogs, 2);

      // Calculations:
      // Item 1 Revenue: 700, COGS: 450 => Profit: 250
      // Item 2 Revenue: 650, COGS: 425 => Profit: 225
      // Item 3 Revenue: 50,  COGS: 31  => Profit: 19
      // Total Revenue = 1400.00
      // Total COGS = 906.00
      // Expected Gross Profit = 1400 - 906 = 494.00

      const grossProfit = roundToDecimals(totalRevenue - totalCogs, 2);
      const grossProfitMargin = roundToDecimals((grossProfit / totalRevenue) * 100, 2);

      assert.strictEqual(totalRevenue, 1400.0);
      assert.strictEqual(totalCogs, 906.0);
      assert.strictEqual(grossProfit, 494.0);
      assert.strictEqual(grossProfitMargin, 35.29); // 494 / 1400 * 100 = 35.2857 -> 35.29%
    });

    it('should calculate net tax liability (Output GST Collected - Input GST Paid)', () => {
      // Sales output GST collected across the month = 15,240.50
      // Purchases input GST paid to suppliers = 11,800.00
      const outputGst = 15240.5;
      const inputGst = 11800.0;

      const netLiability = Math.max(0, roundToDecimals(outputGst - inputGst, 2));
      assert.strictEqual(netLiability, 3440.5);
    });
  });
}
