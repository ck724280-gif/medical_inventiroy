import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseUnits, calculateLooseUnitPrice, MedicineUnitDefinition } from '../tier1-feature-coverage/r3-unit-conversion.test.js';

export function runR3UnitConversionBoundsTests() {
  describe('Tier 2 - R3: Multi-Unit Conversion Engine (Boundary & Corner Cases)', () => {
    const config: MedicineUnitDefinition = {
      primaryUnit: 'Box',
      secondaryUnit: 'Strip',
      tertiaryUnit: 'Tablet',
      conversionPrimaryToSecondary: 10,
      conversionSecondaryToTertiary: 10,
    };

    it('R3-BND-1: should return 0 base units for 0 quantity across all unit levels', () => {
      assert.strictEqual(calculateBaseUnits(0, 'PRIMARY', config), 0);
      assert.strictEqual(calculateBaseUnits(0, 'SECONDARY', config), 0);
      assert.strictEqual(calculateBaseUnits(0, 'TERTIARY', config), 0);
    });

    it('R3-BND-2: should handle fractional decimal secondary units accurately', () => {
      assert.strictEqual(calculateBaseUnits(0.5, 'SECONDARY', config), 5);
      assert.strictEqual(calculateBaseUnits(2.5, 'PRIMARY', config), 250);
    });

    it('R3-BND-3: should handle single-unit medicines where primary = secondary = tertiary', () => {
      const syrupConfig: MedicineUnitDefinition = {
        primaryUnit: 'Bottle',
        secondaryUnit: 'Bottle',
        tertiaryUnit: 'Bottle',
        conversionPrimaryToSecondary: 1,
        conversionSecondaryToTertiary: 1,
      };
      assert.strictEqual(calculateBaseUnits(5, 'PRIMARY', syrupConfig), 5);
      assert.strictEqual(calculateBaseUnits(5, 'SECONDARY', syrupConfig), 5);
      assert.strictEqual(calculateLooseUnitPrice(120.0, 'TERTIARY', syrupConfig), 120.0);
    });

    it('R3-BND-4: should handle extreme bulk conversion factors (1 drum = 50,000 capsules)', () => {
      const bulkConfig: MedicineUnitDefinition = {
        primaryUnit: 'Drum',
        secondaryUnit: 'Pack',
        tertiaryUnit: 'Capsule',
        conversionPrimaryToSecondary: 50,
        conversionSecondaryToTertiary: 1000,
      };
      assert.strictEqual(calculateBaseUnits(2, 'PRIMARY', bulkConfig), 100000);
      assert.strictEqual(calculateLooseUnitPrice(50000, 'TERTIARY', bulkConfig), 1.0);
    });

    it('R3-BND-5: should return 0 unit price for free samples with MRP 0', () => {
      assert.strictEqual(calculateLooseUnitPrice(0, 'TERTIARY', config), 0);
    });
  });
}