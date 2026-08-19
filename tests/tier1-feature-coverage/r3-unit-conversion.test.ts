import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface MedicineUnitDefinition {
  primaryUnit: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionPrimaryToSecondary: number;
  conversionSecondaryToTertiary: number;
}

export function calculateBaseUnits(
  qty: number,
  unitType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY',
  config: MedicineUnitDefinition
): number {
  if (unitType === 'TERTIARY' || !config.secondaryUnit) return qty;
  if (unitType === 'SECONDARY') return qty * (config.conversionSecondaryToTertiary || 1);
  if (unitType === 'PRIMARY') return qty * (config.conversionPrimaryToSecondary || 1) * (config.conversionSecondaryToTertiary || 1);
  return qty;
}

export function calculateLooseUnitPrice(
  basePrice: number,
  unitType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY',
  config: MedicineUnitDefinition
): number {
  const totalBase = (config.conversionPrimaryToSecondary || 1) * (config.conversionSecondaryToTertiary || 1);
  if (unitType === 'PRIMARY') return basePrice;
  if (unitType === 'SECONDARY') return basePrice / (config.conversionPrimaryToSecondary || 1);
  if (unitType === 'TERTIARY') return basePrice / totalBase;
  return basePrice;
}

export function runR3UnitConversionTests() {
  describe('Tier 1 - R3: Strip -> Tablet -> Loose Unit Conversion Engine (Feature Coverage)', () => {
    const doloConfig: MedicineUnitDefinition = {
      primaryUnit: 'Box',
      secondaryUnit: 'Strip',
      tertiaryUnit: 'Tablet',
      conversionPrimaryToSecondary: 10,
      conversionSecondaryToTertiary: 15,
    };

    it('R3-T1-1: should compute base units from Box, Strip, and loose inputs', () => {
      assert.strictEqual(calculateBaseUnits(1, 'PRIMARY', doloConfig), 150);
      assert.strictEqual(calculateBaseUnits(2, 'SECONDARY', doloConfig), 30);
      assert.strictEqual(calculateBaseUnits(7, 'TERTIARY', doloConfig), 7);
    });

    it('R3-T1-2: should atomically deduct stock in base units when loose tablets are sold', () => {
      let stock = 1500;
      stock -= calculateBaseUnits(8, 'TERTIARY', doloConfig);
      assert.strictEqual(stock, 1492);
    });

    it('R3-T1-3: should calculate proportional unit prices for Strip and Loose Tablets', () => {
      assert.strictEqual(calculateLooseUnitPrice(300, 'SECONDARY', doloConfig), 30);
      assert.strictEqual(calculateLooseUnitPrice(300, 'TERTIARY', doloConfig), 2);
    });

    it('R3-T1-4: should handle inward purchase entry in secondary units', () => {
      assert.strictEqual(calculateBaseUnits(50, 'SECONDARY', doloConfig), 750);
    });

    it('R3-T1-5: should evaluate multi-unit mixed cart items accurately', () => {
      const total = calculateBaseUnits(1, 'PRIMARY', doloConfig) + calculateBaseUnits(3, 'SECONDARY', doloConfig) + calculateBaseUnits(5, 'TERTIARY', doloConfig);
      assert.strictEqual(total, 200);
    });
  });
}
