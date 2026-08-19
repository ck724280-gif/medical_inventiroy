import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBarcodeType,
  parseBarcode,
  generateInternalBarcode,
} from '../../packages/shared-utils/src/barcode.js';
import { BarcodeType } from '@medical-inventory/shared-types';

export function runBarcodeEdgeCasesTests() {
  describe('Tier 2 - Barcode & GS1 Boundary Cases', () => {
    it('should parse GS1 DataMatrix with GTIN and Batch Number (without expiry)', () => {
      // 01 = GTIN (14 digits) + 10 = BatchNumber
      const raw = '010890123456789010BATCHONLY123';
      const parsed = parseBarcode(raw);

      assert.strictEqual(parsed.type, BarcodeType.DATAMATRIX);
      assert.strictEqual(parsed.gtin, '08901234567890');
      assert.strictEqual(parsed.expiryDate, undefined);
      assert.strictEqual(parsed.batchNumber, 'BATCHONLY123');
    });

    it('should calculate EAN-13 check digit correctly when sum modulo 10 is 0', () => {
      // Test across multiple unique IDs to verify check digits 0 through 9
      for (let id = 1000; id <= 1010; id++) {
        const code = generateInternalBarcode(id);
        assert.strictEqual(code.length, 13);
        assert.strictEqual(/^\d{13}$/.test(code), true);

        // Verify check digit
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          const d = parseInt(code[i]!, 10);
          sum += i % 2 === 0 ? d : d * 3;
        }
        const expectedCheck = (10 - (sum % 10)) % 10;
        assert.strictEqual(parseInt(code[12]!, 10), expectedCheck);
      }
    });

    it('should fallback to CODE128 for non-standard alphanumeric strings', () => {
      assert.strictEqual(detectBarcodeType('CUSTOM-PHARMA-SKU-99'), BarcodeType.CODE128);
      assert.strictEqual(detectBarcodeType('1234'), BarcodeType.CODE128);
    });
  });
}
