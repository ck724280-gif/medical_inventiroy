/**
 * Formats an invoice number with prefix and zero-padded sequence.
 * e.g., formatInvoiceNumber('ABC-INV', 125, 6) => 'ABC-INV-000125'
 */
export function formatInvoiceNumber(
  prefix: string,
  sequenceNumber: number,
  padLength = 6
): string {
  const cleanPrefix = prefix.trim().replace(/-+$/, '');
  const padded = String(sequenceNumber).padStart(padLength, '0');
  return `${cleanPrefix}-${padded}`;
}

/**
 * Formats a purchase invoice number.
 */
export function formatPurchaseNumber(
  prefix = 'PUR',
  sequenceNumber: number,
  padLength = 6
): string {
  return formatInvoiceNumber(prefix, sequenceNumber, padLength);
}

/**
 * Formats a return number.
 */
export function formatReturnNumber(
  prefix = 'RET',
  sequenceNumber: number,
  padLength = 6
): string {
  return formatInvoiceNumber(prefix, sequenceNumber, padLength);
}
