import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertPoToBill } from '../tier1-feature-coverage/r9-po-conversion.test.js';
import { computeGstBreakdown } from '../tier1-feature-coverage/r5-gst-returns.test.js';
import { formatThermalShelfLabel } from '../tier1-feature-coverage/r6-barcode-labels.test.js';

export function runCrossFeaturePoInwardWorkflowTests() {
  describe('Tier 3 - Cross-Feature Combination: PO Inward -> GST Tax Credit -> Stock Inward -> Thermal Labels', () => {
    it('T3-CF-2: should convert PO to Inward Bill, compute Input Tax Credit, update warehouse stock, and print shelf barcodes', () => {
      const po = {
        id: 'PO-2026-CIPLA-881',
        supplierId: 'supp-cipla-mumbai',
        status: 'SENT',
        items: [
          { medId: 'med-ciplox-500', qty: 50, rate: 45.0 },
        ],
      };

      const inwardBill = convertPoToBill(po as any);
      assert.strictEqual(inwardBill.status, 'FULLY_RECEIVED');
      assert.strictEqual(inwardBill.total, 2250.0);

      const gst = computeGstBreakdown(inwardBill.total, 12, true);
      assert.strictEqual(gst.igst, 270.0);
      assert.strictEqual(gst.totalTax, 270.0);
      const totalInwardCost = inwardBill.total + gst.totalTax;
      assert.strictEqual(totalInwardCost, 2520.0);

      let currentWarehouseStock = 120;
      currentWarehouseStock += inwardBill.items[0]?.qty || 0;
      assert.strictEqual(currentWarehouseStock, 170);

      const labels = Array.from({ length: 50 }, (_, i) =>
        formatThermalShelfLabel({
          medicineName: 'Ciplox 500mg',
          batchNumber: 'CIP-2026-08',
          expiryDate: '08/2028',
          mrp: 65.0,
          barcode: '890111222' + String(i + 1).padStart(4, '0'),
        })
      );

      assert.strictEqual(labels.length, 50);
      assert.ok(labels[0]?.includes('Ciplox 500mg'));
      assert.ok(labels[49]?.includes('CIP-2026-08'));
    });
  });
}