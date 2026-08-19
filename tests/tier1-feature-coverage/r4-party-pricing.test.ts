import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface PartyItemPriceRule {
  partyId: string;
  medicineId: string;
  customPrice?: number;
  discountPercent?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export function resolvePartyPrice(
  partyId: string | null | undefined,
  medicineId: string,
  masterSellingPrice: number,
  rules: PartyItemPriceRule[],
  asOfDate: Date = new Date()
) {
  if (!partyId) return { effectivePrice: masterSellingPrice, discountPercent: 0, isCustomRuleApplied: false };
  const rule = rules.find(r => r.partyId === partyId && r.medicineId === medicineId && new Date(r.effectiveFrom) <= asOfDate && (!r.effectiveTo || new Date(r.effectiveTo) >= asOfDate));
  if (!rule) return { effectivePrice: masterSellingPrice, discountPercent: 0, isCustomRuleApplied: false };
  const discountPercent = rule.discountPercent || 0;
  let effectivePrice = rule.customPrice !== undefined ? rule.customPrice : masterSellingPrice;
  if (discountPercent > 0 && rule.customPrice === undefined) effectivePrice = effectivePrice * (1 - discountPercent / 100);
  return { effectivePrice: Math.round(effectivePrice * 100) / 100, discountPercent, isCustomRuleApplied: true };
}

export function runR4PartyPricingTests() {
  describe('Tier 1 - R4: Party-Wise Special Pricing & Discount Matrix (Feature Coverage)', () => {
    const today = new Date();
    const rules: PartyItemPriceRule[] = [
      { partyId: 'vip-1', medicineId: 'med-1', customPrice: 85, effectiveFrom: new Date(today.getTime() - 10000) },
      { partyId: 'hosp-1', medicineId: 'med-2', discountPercent: 15, effectiveFrom: new Date(today.getTime() - 10000), effectiveTo: new Date(today.getTime() + 1000000) }
    ];

    it('R4-T1-1: should resolve custom price when active rule exists', () => {
      const res = resolvePartyPrice('vip-1', 'med-1', 100, rules, today);
      assert.strictEqual(res.isCustomRuleApplied, true);
      assert.strictEqual(res.effectivePrice, 85);
    });

    it('R4-T1-2: should apply custom discount percentage from party matrix', () => {
      const res = resolvePartyPrice('hosp-1', 'med-2', 200, rules, today);
      assert.strictEqual(res.isCustomRuleApplied, true);
      assert.strictEqual(res.effectivePrice, 170);
    });

    it('R4-T1-3: should fall back to master selling price when no rule exists', () => {
      const res = resolvePartyPrice('reg-1', 'med-1', 100, rules, today);
      assert.strictEqual(res.isCustomRuleApplied, false);
      assert.strictEqual(res.effectivePrice, 100);
    });

    it('R4-T1-4: should respect effective date range window', () => {
      const future = new Date(today.getTime() + 5000000);
      const res = resolvePartyPrice('hosp-1', 'med-2', 200, rules, future);
      assert.strictEqual(res.isCustomRuleApplied, false);
    });

    it('R4-T1-5: should handle walk-in sales without party ID', () => {
      const res = resolvePartyPrice(null, 'med-1', 100, rules, today);
      assert.strictEqual(res.isCustomRuleApplied, false);
    });
  });
}
