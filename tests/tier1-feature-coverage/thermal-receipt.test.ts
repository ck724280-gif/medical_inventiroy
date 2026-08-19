import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscPosService } from '../../apps/api/src/modules/printing/esc-pos.service.js';
import { PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';

export function runThermalReceiptFeatureTests() {
  describe('Tier 1 - ESC/POS Monospace Thermal Receipt Engine (Feature Coverage)', () => {
    const escPosService = new EscPosService();

    const sampleReceiptData: ThermalReceiptDataDto = {
      storeName: 'MedCare Super Speciality Pharmacy',
      address: '123 Medical Avenue, Bangalore - 560001',
      phone: '+91 80 2345 6789',
      email: 'pos@medcare.com',
      gstNumber: '29ABCDE1234F1Z5',
      pharmacyLicense: 'KA-B2-12345',
      invoiceNumber: 'INV-000123',
      date: '19-08-2026',
      time: '11:45 AM',
      cashierName: 'John Pharmacist',
      customerName: 'Rahul Sharma',
      customerMobile: '9876543210',
      items: [
        {
          name: 'Paracetamol 650mg Tabs',
          batch: 'PCM-101',
          expiry: '12-2027',
          qty: 2,
          unit: 'Strip',
          rate: 30.0,
          mrp: 35.0,
          discount: 0,
          tax: 12,
          amount: 60.0,
        },
        {
          name: 'Amoxicillin 500mg',
          batch: 'AMX-202',
          expiry: '10-2026',
          qty: 1,
          unit: 'Strip',
          rate: 120.0,
          mrp: 140.0,
          discount: 5,
          tax: 12,
          amount: 114.0,
        },
      ],
      subtotal: 180.0,
      discountTotal: 6.0,
      taxTotal: 20.88,
      grandTotal: 194.88,
      paymentMode: 'UPI',
      payments: [{ mode: 'UPI', amount: 194.88 }],
      thankYouMessage: 'Thank You! Get Well Soon',
      returnPolicy: 'Goods once sold can only be returned within 7 days with invoice.',
      paperWidth: PaperWidth.WIDTH_58MM,
    };

    it('should generate valid ESC/POS byte commands for 58mm (32 chars) printer', () => {
      const buffer = escPosService.generateEscPosCommands({
        ...sampleReceiptData,
        paperWidth: PaperWidth.WIDTH_58MM,
      });

      assert.ok(buffer instanceof Buffer);
      assert.ok(buffer.length > 0);

      const rawText = buffer.toString('utf-8');

      // Verify header text and store name
      assert.ok(rawText.includes('MedCare Super Speciality Pharmacy'));
      assert.ok(rawText.includes('GSTIN: 29ABCDE1234F1Z5'));
      assert.ok(rawText.includes('D.L. No: KA-B2-12345'));
      assert.ok(rawText.includes('INV-000123'));
      assert.ok(rawText.includes('Rahul Sharma'));

      // Verify item presence
      assert.ok(rawText.includes('Paracetamol'));
      assert.ok(rawText.includes('Amoxicillin'));

      // Verify financials and totals
      assert.ok(rawText.includes('194.88'));
      assert.ok(rawText.includes('Payment: UPI'));
      assert.ok(rawText.includes('Thank You! Get Well Soon'));

      // Verify 58mm divider length (32 dashes)
      assert.ok(rawText.includes('-'.repeat(32)));
    });

    it('should generate valid ESC/POS byte commands for 80mm (48 chars) printer with Batch column', () => {
      const buffer = escPosService.generateEscPosCommands({
        ...sampleReceiptData,
        paperWidth: PaperWidth.WIDTH_80MM,
      });

      assert.ok(buffer instanceof Buffer);
      assert.ok(buffer.length > 0);

      const rawText = buffer.toString('utf-8');

      // Verify 80mm divider length (48 dashes)
      assert.ok(rawText.includes('-'.repeat(48)));

      // In 80mm format, batch number column is explicitly included in the table
      assert.ok(rawText.includes('PCM-101'));
      assert.ok(rawText.includes('AMX-202'));
    });

    it('should include standard thermal printer control codes (Init, Align, Cut)', () => {
      const buffer = escPosService.generateEscPosCommands(sampleReceiptData);

      // ESC @ (Initialize printer): 0x1b, 0x40
      assert.strictEqual(buffer[0], 0x1b);
      assert.strictEqual(buffer[1], 0x40);

      // Verify paper cut command (GS V): 0x1d, 0x56
      const hasCutCommand = buffer.includes(Buffer.from([0x1d, 0x56]));
      assert.strictEqual(hasCutCommand, true);
    });
  });
}
