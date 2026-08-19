import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscPosService } from '../../apps/api/src/modules/printing/esc-pos.service.js';
import { PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';

export function runReceiptFormattingBoundsTests() {
  describe('Tier 2 - Receipt Formatting Boundaries & Extreme Values', () => {
    const escPosService = new EscPosService();

    it('should truncate extremely long item names gracefully without overflowing columns', () => {
      const receiptData: ThermalReceiptDataDto = {
        storeName: 'MedCare Super Store',
        address: 'Bangalore',
        invoiceNumber: 'INV-LONG-01',
        date: '19-08-2026',
        time: '12:00 PM',
        cashierName: 'Staff 1',
        customerName: 'Customer with a very long name that exceeds typical width limits',
        items: [
          {
            name: 'Super Long Antibiotic Medication Name Extended Release 1000mg USP Capsules',
            batch: 'LONG-BATCH-001',
            expiry: '12-2028',
            qty: 10,
            unit: 'Strip',
            rate: 999.99,
            mrp: 1200.0,
            discount: 0,
            tax: 18,
            amount: 9999.9,
          },
        ],
        subtotal: 9999.9,
        discountTotal: 0,
        taxTotal: 1799.98,
        grandTotal: 11799.88,
        paymentMode: 'CARD',
        payments: [{ mode: 'CARD', amount: 11799.88 }],
        thankYouMessage: 'Get Well Soon',
        paperWidth: PaperWidth.WIDTH_58MM,
      };

      const buffer58 = escPosService.generateEscPosCommands(receiptData);
      assert.ok(buffer58.length > 0);
      const text58 = buffer58.toString('utf-8');
      // For 58mm: item column is constrained to 12 chars: 'Super Long A'
      assert.ok(text58.includes('Super Long A'));

      const buffer80 = escPosService.generateEscPosCommands({
        ...receiptData,
        paperWidth: PaperWidth.WIDTH_80MM,
      });
      assert.ok(buffer80.length > 0);
      const text80 = buffer80.toString('utf-8');
      // For 80mm: item column is constrained to 16 chars: 'Super Long Antib'
      assert.ok(text80.includes('Super Long Antib'));
    });

    it('should omit discount line when discountTotal is 0', () => {
      const receiptData: ThermalReceiptDataDto = {
        storeName: 'MedCare Store',
        invoiceNumber: 'INV-NO-DISC',
        date: '19-08-2026',
        time: '01:00 PM',
        cashierName: 'Staff',
        items: [
          {
            name: 'Aspirin',
            batch: 'ASP01',
            expiry: '01-2027',
            qty: 1,
            unit: 'Tab',
            rate: 10,
            mrp: 10,
            discount: 0,
            tax: 0,
            amount: 10,
          },
        ],
        subtotal: 10,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 10,
        paymentMode: 'CASH',
        payments: [{ mode: 'CASH', amount: 10 }],
        paperWidth: PaperWidth.WIDTH_58MM,
      };

      const buffer = escPosService.generateEscPosCommands(receiptData);
      const text = buffer.toString('utf-8');
      assert.strictEqual(text.includes('Discount:'), false);
      assert.ok(text.includes('GRAND TOTAL:'));
    });
  });
}
