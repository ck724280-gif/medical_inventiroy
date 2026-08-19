import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePartyPrice, PartyItemPriceRule } from '../tier1-feature-coverage/r4-party-pricing.test.js';

export function runR4PartyPricingBoundsTests() {
  describe('Tier 2 - R4: Party Pricing Matrix (Boundary & Corner Cases)', () => {
    const today = new Date();
    it('R4-BND-1: should handle 100% discount rate resulting in zero net price', () => {
      const rules: PartyItemPriceRule[] = [{ partyId: 'party-charity', medicineId: 'med-1', discountPercent: 100, effectiveFrom: today }];
      const res = resolvePartyPrice('party-charity', 'med-1', 150.0, rules, today);
      assert.strictEqual(res.effectivePrice, 0);
    });

    it('R4-BND-2: should handle 0 base MRP resulting in 0 resolved price', () => {
      const rules: PartyItemPriceRule[] = [{ partyId: 'party-1', medicineId: 'med-1', discountPercent: 10, effectiveFrom: today }];
      const res = resolvePartyPrice('party-1', 'med-1', 0, rules, today);
      assert.strictEqual(res.effectivePrice, 0);
    });

    it('R4-BND-3: should handle extreme high-value oncology medications with custom pricing', () => {
      const rules: PartyItemPriceRule[] = [{ partyId: 'party-hospital-1', medicineId: 'med-onco-1', customPrice: 185000.0, effectiveFrom: today }];
      const res = resolvePartyPrice('party-hospital-1', 'med-onco-1', 210000.0, rules, today);
      assert.strictEqual(res.effectivePrice, 185000.0);
    });

    it('R4-BND-4: should handle fractional discount percentages accurately', () => {
      const rules: PartyItemPriceRule[] = [{ partyId: 'party-dist-1', medicineId: 'med-paracip', discountPercent: 7.5, effectiveFrom: today }];
      const res = resolvePartyPrice('party-dist-1', 'med-paracip', 100.0, rules, today);
      assert.strictEqual(res.effectivePrice, 92.5);
    });

    it('R4-BND-5: should handle empty rules without modification to default MRP', () => {
      const res = resolvePartyPrice('party-walkin', 'med-1', 75.50, [], today);
      assert.strictEqual(res.effectivePrice, 75.50);
    });
  });
}