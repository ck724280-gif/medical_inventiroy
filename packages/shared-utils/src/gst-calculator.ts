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
