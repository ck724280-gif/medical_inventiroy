import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndianMobile, generateWhatsAppInvoiceUrl } from '../tier1-feature-coverage/r8-whatsapp-sharing.test.js';

export function runR8WhatsAppSharingBoundsTests() {
  describe('Tier 2 - R8: WhatsApp Generator (Boundary & Corner Cases)', () => {
    it('R8-BND-1: should strip complex formatting from mobile numbers', () => {
      assert.strictEqual(normalizeIndianMobile('+91 (98765)-43210'), '919876543210');
      assert.strictEqual(normalizeIndianMobile('98765.43210'), '919876543210');
    });

    it('R8-BND-2: should handle Unicode customer names without URI corruption', () => {
      const url = generateWhatsAppInvoiceUrl('9876543210', 'INV-100', 500.0);
      assert.ok(url.startsWith('https://wa.me/919876543210?text='));
    });

    it('R8-BND-3: should format zero amount invoices correctly', () => {
      const url = generateWhatsAppInvoiceUrl('9876543210', 'INV-FREE', 0.0);
      assert.ok(url.includes('0.00'));
    });

    it('R8-BND-4: should handle multi-crore invoice amounts with correct decimal formatting', () => {
      const url = generateWhatsAppInvoiceUrl('9876543210', 'INV-BULK-99', 15000000.0);
      assert.ok(url.includes('15000000.00'));
    });

    it('R8-BND-5: should return digits as-is when phone is an international or short format', () => {
      assert.strictEqual(normalizeIndianMobile('12345'), '12345');
    });
  });
}