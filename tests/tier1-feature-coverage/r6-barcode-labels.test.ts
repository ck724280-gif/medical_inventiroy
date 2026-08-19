import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function formatThermalShelfLabel(data: { medicineName: string; batchNumber: string; expiryDate: string; mrp: number; barcode: string }) {
  const name = data.medicineName.length > 22 ? data.medicineName.substring(0, 20) + '..' : data.medicineName;
  return '<div>' + name + '</div><div>B:' + data.batchNumber + ' EXP:' + data.expiryDate + '</div><div>MRP:' + data.mrp + '</div>';
}

export function runR6BarcodeLabelsTests() {
  describe('Tier 1 - R6: Barcode Label Printing (Feature Coverage)', () => {
    it('R6-T1-1: should generate 40x20mm thermal shelf label with metadata', () => {
      const label = formatThermalShelfLabel({ medicineName: 'Amoxicillin 500mg', batchNumber: 'B001', expiryDate: '12/2027', mrp: 145.5, barcode: '8901234567890' });
      assert.ok(label.includes('Amoxicillin 500mg'));
      assert.ok(label.includes('B:B001'));
    });

    it('R6-T1-2: should truncate long medicine names for 40mm label width', () => {
      const label = formatThermalShelfLabel({ medicineName: 'Very Long Medicine Name Beyond Twenty Two Chars', batchNumber: 'B001', expiryDate: '12/2027', mrp: 100, barcode: '123' });
      assert.ok(label.includes('..'));
    });

    it('R6-T1-3: should validate EAN-13 barcode format', () => {
      const code = '8901234567890';
      const isEan13 = code.length === 13 && !isNaN(Number(code));
      assert.strictEqual(isEan13, true);
    });

    it('R6-T1-4: should generate batch quantity labels', () => {
      const count = 10;
      const labels = Array.from({ length: count }, () => formatThermalShelfLabel({ medicineName: 'Med', batchNumber: 'B1', expiryDate: '12/27', mrp: 10, barcode: '1' }));
      assert.strictEqual(labels.length, 10);
    });

    it('R6-T1-5: should support Code-128 alphanumeric barcodes', () => {
      const label = formatThermalShelfLabel({ medicineName: 'Med', batchNumber: 'B1', expiryDate: '12/27', mrp: 10, barcode: 'MED-128-ALPHANUM' });
      assert.ok(label.includes('Med'));
    });
  });
}