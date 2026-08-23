export function normalizeIndianMobile(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return digits;
}

export function sanitizeMobileForWhatsApp(mobile: string): string {
  return normalizeIndianMobile(mobile);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = normalizeIndianMobile(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppInvoiceUrl(
  phone: string,
  invoiceNumber: string,
  grandTotal: number,
  pdfUrl?: string,
  storeName: string = 'Medical Store',
  customerName?: string
): string {
  const cleanPhone = normalizeIndianMobile(phone);
  const greeting = customerName && customerName !== 'Walk-in Customer' ? `Dear ${customerName}` : 'Dear Customer';
  let message = `${greeting}, thank you for shopping with *${storeName}*.\n\n` +
    `📄 *Invoice No:* #${invoiceNumber}\n` +
    `💰 *Total Amount:* Rs. ${Number(grandTotal || 0).toFixed(2)}\n\n` +
    `Your tax invoice has been generated.`;
  if (pdfUrl) {
    message += `\n📥 *Download Bill:* ${pdfUrl}`;
  }
  message += `\n\nThank you for choosing *${storeName}*. Wishing you good health!`;
  return buildWhatsAppUrl(cleanPhone, message);
}

export function generatePaymentReminderUrl(
  phone: string,
  customerName: string,
  balanceDue: number,
  upiId?: string,
  storeName: string = 'Medical Store'
): string {
  const cleanPhone = normalizeIndianMobile(phone);
  let message = `Hello ${customerName}, gentle reminder that an outstanding balance of Rs. ${Number(balanceDue || 0).toFixed(2)} is pending with *${storeName}*. Please clear at your earliest convenience.`;
  if (upiId) {
    message += `\n💳 *UPI ID for payment:* ${upiId}`;
  }
  message += `\n\nRegards,\n*${storeName}*`;
  return buildWhatsAppUrl(cleanPhone, message);
}

export function generateSaleInvoiceMessage(invoice: {
  invoiceNumber: string;
  storeName?: string;
  customerName?: string;
  totalAmount: number;
  date?: string | Date;
  items?: Array<{ name: string; qty: number; unit?: string; total: number }>;
  pdfUrl?: string;
}): string {
  const store = invoice.storeName || 'Medical Pharmacy & Healthcare';
  const itemsText = (invoice.items || [])
    .map((item) => `• ${item.name} x ${item.qty} ${item.unit || 'unit'} - Rs. ${Number(item.total).toFixed(2)}`)
    .join('\n');

  let msg = `🏥 *${store.toUpperCase()} - TAX INVOICE*\n` +
    `----------------------------------------\n` +
    `📄 *Invoice:* ${invoice.invoiceNumber}\n` +
    `👤 *Customer:* ${invoice.customerName || 'Cash Customer'}\n` +
    `💰 *Grand Total:* Rs. ${Number(invoice.totalAmount || 0).toFixed(2)}\n` +
    `----------------------------------------\n` +
    `*Items Purchased:*\n` +
    `${itemsText || 'Standard items'}\n` +
    `----------------------------------------`;
  
  if (invoice.pdfUrl) {
    msg += `\n📥 *View/Download PDF:* ${invoice.pdfUrl}\n----------------------------------------`;
  }
  
  msg += `\nThank you for choosing ${store}. Get well soon!`;
  return msg;
}
