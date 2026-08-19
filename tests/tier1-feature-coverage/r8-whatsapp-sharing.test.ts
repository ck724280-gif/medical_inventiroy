import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return digits;
}

export function generateWhatsAppInvoiceUrl(phone: string, invoiceNumber: string, grandTotal: number, pdfUrl?: string): string {
  const cleanPhone = normalizeIndianMobile(phone);
  let message = 'Dear Customer, thank you for visiting MedCare Pharmacy. Your invoice #' + invoiceNumber + ' for Rs. ' + grandTotal.toFixed(2) + ' is ready.';
  if (pdfUrl) {
    message += ' Download Bill: ' + pdfUrl;
  }
  return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
}

export function generatePaymentReminderUrl(phone: string, customerName: string, balanceDue: number): string {
  const cleanPhone = normalizeIndianMobile(phone);
  const message = 'Hello ' + customerName + ', gentle reminder that an outstanding balance of Rs. ' + balanceDue.toFixed(2) + ' is pending with MedCare Pharmacy. Please clear at earliest.';
  return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
}

export function runR8WhatsAppSharingTests() {
  describe('Tier 1 - R8: WhatsApp Message & Invoice Link Generator', () => {
    it('R8-T1-1: should normalize 10-digit, 12-digit, and leading-zero Indian mobile numbers to 91XXXXXXXXXX', () => {
      assert.strictEqual(normalizeIndianMobile('9876543210'), '919876543210');
      assert.strictEqual(normalizeIndianMobile('+91 98765 43210'), '919876543210');
      assert.strictEqual(normalizeIndianMobile('09876543210'), '919876543210');
    });

    it('R8-T1-2: should generate compliant wa.me deep link with encoded invoice message', () => {
      const url = generateWhatsAppInvoiceUrl('9876543210', 'INV-2026-001', 450.50);
      assert.ok(url.startsWith('https://wa.me/919876543210?text='));
      assert.ok(url.includes('INV-2026-001'));
      assert.ok(url.includes('450.50'));
    });

    it('R8-T1-3: should include PDF download URL when provided', () => {
      const url = generateWhatsAppInvoiceUrl('9876543210', 'INV-002', 1200.0, 'https://cdn.medcare.com/invoices/inv-002.pdf');
      assert.ok(url.includes('https%3A%2F%2Fcdn.medcare.com%2Finvoices%2Finv-002.pdf'));
    });

    it('R8-T1-4: should generate payment reminder URL with pending balance and party name', () => {
      const url = generatePaymentReminderUrl('9876543210', 'Suresh Kumar', 850.0);
      assert.ok(url.startsWith('https://wa.me/919876543210?text='));
      assert.ok(url.includes('Suresh%20Kumar'));
      assert.ok(url.includes('850.00'));
    });

    it('R8-T1-5: should safely URI-encode special characters in customer name and currency symbols', () => {
      const url = generatePaymentReminderUrl('9876543210', 'M/s Apollo & Co.', 500.0);
      assert.ok(url.includes('M%2Fs%20Apollo%20%26%20Co.'));
    });
  });
}