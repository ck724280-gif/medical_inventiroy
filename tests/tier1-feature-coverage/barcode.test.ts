import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBarcodeType,
  parseBarcode,
  generateInternalBarcode,
} from '../../packages/shared-utils/src/barcode.js';
import { BarcodeType } from '@medical-inventory/shared-types';

export function runBarcodeFeatureTests() {
  describe('Tier 1 - Barcode & GS1 DataMatrix Parser (Feature Coverage)', () => {
    it('should detect standard barcode formats correctly', () => {
      assert.strictEqual(detectBarcodeType('8901234567890'), BarcodeType.EAN13);
      assert.strictEqual(detectBarcodeType('012345678905'), BarcodeType.UPC_A);
      assert.strictEqual(detectBarcodeType('12345670'), BarcodeType.EAN8);
      assert.strictEqual(detectBarcodeType('123456'), BarcodeType.UPC_E);
      assert.strictEqual(detectBarcodeType('MED-ABC-123'), BarcodeType.CODE128);
      assert.strictEqual(detectBarcodeType('01089012345678901726081910BATCH123'), BarcodeType.DATAMATRIX);
      assert.strictEqual(detectBarcodeType('https://rx.med/item|BATCH123'), BarcodeType.QR);
    });

    it('should parse GS1 DataMatrix with GTIN, Expiry Date, and Batch Number', () => {
      // 01 = GTIN (14 digits), 17 = Expiry (YYMMDD -> 260819 = 2026-08-19), 10 = Batch (BATCH999)
      const raw = '01089012345678901726081910BATCH999';
      const parsed = parseBarcode(raw);

      assert.strictEqual(parsed.type, BarcodeType.DATAMATRIX);
      assert.strictEqual(parsed.gtin, '08901234567890');
      assert.strictEqual(parsed.expiryDate, '2026-08-19');
      assert.strictEqual(parsed.batchNumber, 'BATCH999');
    });

    it('should generate valid internal EAN-13 barcodes with correct check digit', () => {
      const barcode = generateInternalBarcode(12345);

      assert.strictEqual(barcode.length, 13);
      assert.ok(barcode.startsWith('200')); // internal retail prefix

      // Verify EAN-13 check digit algorithm
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode[i]!, 10);
        sum += i % 2 === 0 ? digit : digit * 3;
      }
      const expectedCheck = (10 - (sum % 10)) % 10;
      const actualCheck = parseInt(barcode[12]!, 10);

      assert.strictEqual(actualCheck, expectedCheck);
    });
  });
}
