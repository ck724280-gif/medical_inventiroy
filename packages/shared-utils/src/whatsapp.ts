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
  pdfUrl?: string
): string {
  const cleanPhone = normalizeIndianMobile(phone);
  let message = `Dear Customer, thank you for visiting MedCare Pharmacy. Your invoice #${invoiceNumber} for Rs. ${Number(grandTotal || 0).toFixed(2)} is ready.`;
  if (pdfUrl) {
    message += ` Download Bill: ${pdfUrl}`;
  }
  return buildWhatsAppUrl(cleanPhone, message);
}

export function generatePaymentReminderUrl(
  phone: string,
  customerName: string,
  balanceDue: number,
  upiId?: string
): string {
  const cleanPhone = normalizeIndianMobile(phone);
  let message = `Hello ${customerName}, gentle reminder that an outstanding balance of Rs. ${Number(balanceDue || 0).toFixed(2)} is pending with MedCare Pharmacy. Please clear at earliest.`;
  if (upiId) {
    message += ` UPI ID: ${upiId}`;
  }
  return buildWhatsAppUrl(cleanPhone, message);
}

export function generateSaleInvoiceMessage(invoice: {
  invoiceNumber: string;
  customerName?: string;
  totalAmount: number;
  date?: string | Date;
  items?: Array<{ name: string; qty: number; unit?: string; total: number }>;
}): string {
  const itemsText = (invoice.items || [])
    .map((item) => `• ${item.name} x ${item.qty} ${item.unit || 'unit'} - Rs. ${Number(item.total).toFixed(2)}`)
    .join('\n');

  return `🏥 *MEDCARE PHARMACY - TAX INVOICE*
----------------------------------------
📄 *Invoice:* ${invoice.invoiceNumber}
👤 *Customer:* ${invoice.customerName || 'Cash Customer'}
💰 *Grand Total:* Rs. ${Number(invoice.totalAmount || 0).toFixed(2)}
----------------------------------------
*Items Purchased:*
${itemsText || 'Standard items'}
----------------------------------------
Thank you for choosing MedCare. Get well soon!`;
}
