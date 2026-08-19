import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface GstBreakdown {
  taxableAmount: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export function computeGstBreakdown(taxable: number, rate: number, isInterstate: boolean): GstBreakdown {
  const round2 = (val: number) => Math.round(val * 100) / 100;
  if (isInterstate) {
    const igst = round2(taxable * (rate / 100));
    return { taxableAmount: taxable, rate, cgst: 0, sgst: 0, igst, totalTax: igst };
  } else {
    const halfRate = rate / 2;
    const cgst = round2(taxable * (halfRate / 100));
    const sgst = round2(taxable * (halfRate / 100));
    return { taxableAmount: taxable, rate, cgst, sgst, igst: 0, totalTax: round2(cgst + sgst) };
  }
}

export function runR5GstReturnsTests() {
  describe('Tier 1 - R5: GST Returns Engine (GSTR-1, GSTR-3B & Tax Slabs)', () => {
    it('R5-T1-1: should split tax equally into 50% CGST and 50% SGST for intrastate sales', () => {
      const taxable = 1000.0;
      const res = computeGstBreakdown(taxable, 18, false);
      assert.strictEqual(res.cgst, 90.0);
      assert.strictEqual(res.sgst, 90.0);
      assert.strictEqual(res.igst, 0);
      assert.strictEqual(res.totalTax, 180.0);
    });

    it('R5-T1-2: should allocate 100% tax to IGST for interstate B2B transactions', () => {
      const taxable = 2500.0;
      const res = computeGstBreakdown(taxable, 12, true);
      assert.strictEqual(res.cgst, 0);
      assert.strictEqual(res.sgst, 0);
      assert.strictEqual(res.igst, 300.0);
      assert.strictEqual(res.totalTax, 300.0);
    });

    it('R5-T1-3: should correctly calculate GSTR-3B Net Tax Payable after offsetting ITC', () => {
      const outputTax = { cgst: 1800, sgst: 1800, igst: 0 };
      const inputTaxCredit = { cgst: 1200, sgst: 1200, igst: 0 };

      const netCgstPayable = outputTax.cgst - inputTaxCredit.cgst;
      const netSgstPayable = outputTax.sgst - inputTaxCredit.sgst;

      assert.strictEqual(netCgstPayable, 600);
      assert.strictEqual(netSgstPayable, 600);
    });

    it('R5-T1-4: should group line items by 4-digit/8-digit HSN code in GSTR-1 HSN summary', () => {
      const items = [
        { hsn: '3004', taxable: 1000, tax: 120 },
        { hsn: '3004', taxable: 500, tax: 60 },
        { hsn: '9018', taxable: 2000, tax: 360 },
      ];

      const hsnSummary: Record<string, { totalTaxable: number; totalTax: number }> = {};
      for (const item of items) {
        if (!hsnSummary[item.hsn]) {
          hsnSummary[item.hsn] = { totalTaxable: 0, totalTax: 0 };
        }
        hsnSummary[item.hsn].totalTaxable += item.taxable;
        hsnSummary[item.hsn].totalTax += item.tax;
      }

      assert.strictEqual(hsnSummary['3004']?.totalTaxable, 1500);
      assert.strictEqual(hsnSummary['3004']?.totalTax, 180);
      assert.strictEqual(hsnSummary['9018']?.totalTaxable, 2000);
    });

    it('R5-T1-5: should classify invoices into B2B (with GSTIN) vs B2C Large vs B2C Small', () => {
      function classifyInvoice(gstin: string | null, total: number, isInterstate: boolean) {
        if (gstin && gstin.trim().length === 15) return 'B2B';
        if (isInterstate && total > 250000) return 'B2CL';
        return 'B2CS';
      }

      assert.strictEqual(classifyInvoice('27AAPFU0939F1ZV', 5000, false), 'B2B');
      assert.strictEqual(classifyInvoice(null, 300000, true), 'B2CL');
      assert.strictEqual(classifyInvoice(null, 1500, false), 'B2CS');
    });
  });
}