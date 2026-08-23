import { normalizeIndianMobile, generateWhatsAppInvoiceUrl, generateSaleInvoiceMessage } from '@medical-inventory/shared-utils';

export interface WhatsAppShareOptions {
  invoiceNumber: string;
  customerName?: string;
  customerMobile?: string;
  totalAmount: number;
  storeName?: string;
  pdfUrl?: string;
  items?: Array<{ name: string; qty: number; unit?: string; total: number }>;
}

export interface ShareResult {
  success: boolean;
  channel: 'web_share' | 'whatsapp_web' | 'whatsapp_app' | 'manual_prompt';
  message?: string;
}

/**
 * Validates and normalizes phone number for Indian and international WhatsApp
 */
export function validateAndFormatWhatsAppMobile(phone: string): { isValid: boolean; formatted: string; clean: string } {
  if (!phone) return { isValid: false, formatted: '', clean: '' };
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return { isValid: true, formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, clean: '91' + digits };
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { isValid: true, formatted: `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`, clean: digits };
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const withoutZero = digits.slice(1);
    return { isValid: true, formatted: `+91 ${withoutZero.slice(0, 5)} ${withoutZero.slice(5)}`, clean: '91' + withoutZero };
  }

  // Fallback if international number of 10-15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return { isValid: true, formatted: `+${digits}`, clean: digits };
  }

  return { isValid: false, formatted: phone, clean: digits };
}

/**
 * Triggers complete cross-platform WhatsApp bill sharing workflow
 */
export async function shareInvoiceViaWhatsApp(options: WhatsAppShareOptions): Promise<ShareResult> {
  const { invoiceNumber, customerName, customerMobile, totalAmount, storeName = 'Medical Store', pdfUrl, items } = options;

  let targetPhone = customerMobile?.trim() || '';

  // 1. If phone is missing, prompt user interactively
  if (!targetPhone || targetPhone === 'N/A') {
    const entered = window.prompt(
      `Enter WhatsApp mobile number for ${customerName || 'Customer'}:\n(e.g., 9876543210)`
    );
    if (!entered) {
      return { success: false, channel: 'manual_prompt', message: 'Sharing cancelled: No mobile number provided.' };
    }
    targetPhone = entered.trim();
  }

  const { isValid, clean } = validateAndFormatWhatsAppMobile(targetPhone);
  if (!isValid) {
    alert(`Invalid mobile number (${targetPhone}). Please enter a valid 10-digit mobile number.`);
    return { success: false, channel: 'manual_prompt', message: 'Invalid mobile number format.' };
  }

  // 2. Generate formatted WhatsApp text message
  const fullText = generateSaleInvoiceMessage({
    invoiceNumber,
    storeName,
    customerName,
    totalAmount,
    items,
    pdfUrl,
  });

  // 3. Try Native Web Share API on supported mobile browsers (Android Chrome, iOS Safari)
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isMobile && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `${storeName} - Invoice #${invoiceNumber}`,
        text: fullText,
        url: pdfUrl || undefined,
      });
      return { success: true, channel: 'web_share', message: 'Invoice shared successfully via native share.' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, channel: 'web_share', message: 'Share sheet dismissed by user.' };
      }
      // Fall through to direct WhatsApp deep link
    }
  }

  // 4. Desktop / Fallback WhatsApp URL
  const whatsappUrl = `https://wa.me/${clean}?text=${encodeURIComponent(fullText)}`;
  
  // Open in new tab or popup
  const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    // If popup blocked, direct location redirect
    window.location.href = whatsappUrl;
  }

  return { success: true, channel: 'whatsapp_web', message: 'WhatsApp opened with pre-filled invoice message.' };
}
