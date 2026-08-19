import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseUnits, calculateLooseUnitPrice, MedicineUnitDefinition } from '../tier1-feature-coverage/r3-unit-conversion.test.js';
import { resolvePartyPrice, PartyItemPriceRule } from '../tier1-feature-coverage/r4-party-pricing.test.js';
import { computeGstBreakdown } from '../tier1-feature-coverage/r5-gst-returns.test.js';
import { validateScheduleHPrescription } from '../tier1-feature-coverage/r7-schedule-h.test.js';
import { generateWhatsAppInvoiceUrl } from '../tier1-feature-coverage/r8-whatsapp-sharing.test.js';

export function runCrossFeaturePosWorkflowTests() {
  describe('Tier 3 - Cross-Feature Combination: POS -> Schedule H -> Unit Conversion -> Party Pricing -> WhatsApp', () => {
    it('T3-CF-1: should execute full omnichannel POS dispensing flow with multi-unit conversion and tax calculations', () => {
      const rxValidation = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        doctorName: 'Dr. Rajesh Mehta',
        doctorRegNo: 'MCI-554433',
        patientName: 'Vikas Khanna',
        patientAge: 42,
      });
      assert.strictEqual(rxValidation.isValid, true);

      const unitDef: MedicineUnitDefinition = {
        primaryUnit: 'Box',
        secondaryUnit: 'Strip',
        tertiaryUnit: 'Tablet',
        conversionPrimaryToSecondary: 10,
        conversionSecondaryToTertiary: 10,
      };

      const boxMrp = 200.0;
      const looseUnitPrice = calculateLooseUnitPrice(boxMrp, 'TERTIARY', unitDef);
      assert.strictEqual(looseUnitPrice, 2.0);

      const requestedLooseTablets = 15;
      const baseUnitsDeducted = calculateBaseUnits(requestedLooseTablets, 'TERTIARY', unitDef);
      assert.strictEqual(baseUnitsDeducted, 15);

      const today = new Date();
      const rules: PartyItemPriceRule[] = [{
        partyId: 'party-senior-citizen',
        medicineId: 'med-amoxicillin-500',
        discountPercent: 10,
        effectiveFrom: today,
      }];
      const priceRes = resolvePartyPrice('party-senior-citizen', 'med-amoxicillin-500', looseUnitPrice, rules, today);
      assert.strictEqual(priceRes.effectivePrice, 1.8);

      const taxableTotal = requestedLooseTablets * priceRes.effectivePrice;
      assert.strictEqual(taxableTotal, 27.0);

      const gst = computeGstBreakdown(taxableTotal, 12, false);
      assert.strictEqual(gst.cgst, 1.62);
      assert.strictEqual(gst.sgst, 1.62);
      assert.strictEqual(gst.totalTax, 3.24);

      const grandTotal = Math.round((taxableTotal + gst.totalTax) * 100) / 100;
      assert.strictEqual(grandTotal, 30.24);

      let currentStock = 100;
      currentStock -= baseUnitsDeducted;
      assert.strictEqual(currentStock, 85);

      const waUrl = generateWhatsAppInvoiceUrl('9876543210', 'INV-2026-POS-09', grandTotal);
      assert.ok(waUrl.includes('https://wa.me/919876543210'));
      assert.ok(waUrl.includes('INV-2026-POS-09'));
      assert.ok(waUrl.includes('30.24'));
    });
  });
}