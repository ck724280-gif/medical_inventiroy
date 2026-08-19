/**
 * Formats a number to monetary standard with 2 decimal places.
 */
export function formatCurrency(
  amount: number,
  currencySymbol = '₹',
  decimalPlaces = 2
): string {
  const rounded = roundToDecimals(amount, decimalPlaces);
  return `${currencySymbol}${rounded.toLocaleString('en-IN', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })}`;
}

/**
 * Rounds a financial number to the given number of decimal places, avoiding floating point issues.
 */
export function roundToDecimals(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates item totals with line discounts and GST/taxes.
 */
export function calculateLineTotal(
  qty: number,
  rate: number,
  discountPercent = 0,
  taxPercent = 0
): {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = roundToDecimals(qty * rate);
  const discountAmount = roundToDecimals((subtotal * discountPercent) / 100);
  const taxableAmount = roundToDecimals(subtotal - discountAmount);
  const taxAmount = roundToDecimals((taxableAmount * taxPercent) / 100);
  const total = roundToDecimals(taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}
