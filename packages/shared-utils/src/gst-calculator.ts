export interface GstBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grossAmount: number;
}

export function calculateGstBreakdown(
  taxableAmount: number,
  taxPercent: number,
  isInterState: boolean = false
): GstBreakdown {
  const taxable = Number(taxableAmount || 0);
  const rate = Number(taxPercent || 0);

  if (taxable <= 0 || rate <= 0) {
    return {
      taxableAmount: taxable,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      grossAmount: taxable,
    };
  }

  if (isInterState) {
    const igstAmount = Number(((taxable * rate) / 100).toFixed(2));
    return {
      taxableAmount: taxable,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: rate,
      igstAmount,
      totalTax: igstAmount,
      grossAmount: Number((taxable + igstAmount).toFixed(2)),
    };
  } else {
    const halfRate = rate / 2;
    const cgstAmount = Number(((taxable * halfRate) / 100).toFixed(2));
    const sgstAmount = Number(((taxable * halfRate) / 100).toFixed(2));
    const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
    return {
      taxableAmount: taxable,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      grossAmount: Number((taxable + totalTax).toFixed(2)),
    };
  }
}

export interface HsnSummaryItem {
  hsnCode: string;
  description?: string;
  uqc?: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  taxRate: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cessAmount: number;
}

export function calculateDetailedLineTotal(
  qty: number,
  rate: number,
  discountPercent: number = 0,
  taxPercent: number = 0,
  isInterState: boolean = false
) {
  const quantity = Math.max(0, Number(qty) || 0);
  const unitRate = Math.max(0, Number(rate) || 0);
  const discountRate = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const gstRate = Math.max(0, Number(taxPercent) || 0);

  const subtotal = Number((quantity * unitRate).toFixed(2));
  const discountAmount = Number(((subtotal * discountRate) / 100).toFixed(2));
  const taxableAmount = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  const gst = calculateGstBreakdown(taxableAmount, gstRate, isInterState);
  const lineTotal = Number((taxableAmount + gst.totalTax).toFixed(2));

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgstRate: gst.cgstRate,
    cgstAmount: gst.cgstAmount,
    sgstRate: gst.sgstRate,
    sgstAmount: gst.sgstAmount,
    igstRate: gst.igstRate,
    igstAmount: gst.igstAmount,
    taxAmount: gst.totalTax,
    lineTotal,
  };
}

export function calculateCashChange(grandTotal: number, receivedAmount: number): {
  changeAmount: number;
  isSufficient: boolean;
} {
  const total = Number(grandTotal || 0);
  const received = Number(receivedAmount || 0);
  const change = Number((received - total).toFixed(2));

  return {
    changeAmount: Math.max(0, change),
    isSufficient: received >= total,
  };
}

export type RoundOffMode = 'floor' | 'nearest' | 'none';

export function calculateRoundOff(
  amount: number,
  mode: RoundOffMode = 'floor'
): { roundOffAmount: number; roundedTotal: number } {
  const raw = Number(amount || 0);
  if (mode === 'none') {
    return { roundOffAmount: 0, roundedTotal: Number(raw.toFixed(2)) };
  }
  if (mode === 'nearest') {
    const rounded = Math.round(raw);
    const roundOffAmount = Number((rounded - raw).toFixed(2));
    return { roundOffAmount, roundedTotal: rounded };
  }
  // Default: 'floor' (Always round down to nearest rupee: 33.67 -> 33.00, 33.34 -> 33.00)
  const rounded = Math.floor(raw);
  const roundOffAmount = Number((rounded - raw).toFixed(2));
  return { roundOffAmount, roundedTotal: rounded };
}

