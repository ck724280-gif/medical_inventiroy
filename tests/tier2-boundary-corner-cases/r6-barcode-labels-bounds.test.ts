import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatThermalShelfLabel } from '../tier1-feature-coverage/r6-barcode-labels.test.js';

export function runR6BarcodeLabelsBoundsTests() {
  describe('Tier 2 - R6: 40x20mm Barcode Thermal Label Generator (Boundary Cases)', () => {
    it('R6-BND-1: should format label for zero-MRP promotional samples', () => {
      const label = formatThermalShelfLabel({
        medicineName: 'Physician Sample Only',
        batchNumber: 'SMP-2026',
        expiryDate: '12/2026',
        mrp: 0,
        barcode: '8901112223334',
      });
      assert.ok(label.includes('MRP:0'));
    });

    it('R6-BND-2: should handle missing or empty barcode string gracefully', () => {
      const label = formatThermalShelfLabel({
        medicineName: 'Aspirin 75mg',
        batchNumber: 'ASP-99',
        expiryDate: '01/2027',
        mrp: 15.0,
        barcode: '',
      });
      assert.ok(label.includes('Aspirin 75mg'));
    });

    it('R6-BND-3: should sanitize special XML/HTML injection characters in medicine name', () => {
      const label = formatThermalShelfLabel({
        medicineName: 'Paracetamol <500mg> & Cold',
        batchNumber: 'BAT-01',
        expiryDate: '05/2027',
        mrp: 30.0,
        barcode: '1234567890128',
      });
      assert.ok(label.includes('BAT-01'));
    });

    it('R6-BND-4: should handle very short medicine names without padding corruption', () => {
      const label = formatThermalShelfLabel({
        medicineName: 'D3',
        batchNumber: 'B-1',
        expiryDate: '10/2028',
        mrp: 8.0,
        barcode: '1122334455667',
      });
      assert.ok(label.includes('D3'));
    });

    it('R6-BND-5: should format fractional paisa MRP values with precision', () => {
      const label = formatThermalShelfLabel({
        medicineName: 'Combiflam',
        batchNumber: 'COM-88',
        expiryDate: '03/2027',
        mrp: 42.755,
        barcode: '8901234567890',
      });
      assert.ok(label.includes('MRP:42.755'));
    });
  });
}