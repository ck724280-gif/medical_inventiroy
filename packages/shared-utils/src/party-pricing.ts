export interface PartyPriceRule {
  customPrice?: number | null;
  discountPercent?: number | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  isActive?: boolean;
}

export function isSpecialPriceValid(rule: PartyPriceRule, targetDate: Date = new Date()): boolean {
  if (!rule || rule.isActive === false) return false;
  const time = targetDate.getTime();

  if (rule.effectiveFrom) {
    const fromTime = new Date(rule.effectiveFrom).getTime();
    if (time < fromTime) return false;
  }

  if (rule.effectiveTo) {
    const toTime = new Date(rule.effectiveTo).getTime();
    if (time > toTime) return false;
  }

  return true;
}

export function resolvePartyItemPrice(
  baseSellingPrice: number,
  baseMrp: number,
  partyPriceRule?: PartyPriceRule | null,
  targetDate: Date = new Date()
): { price: number; discountPercent: number; isCustom: boolean } {
  if (!partyPriceRule || !isSpecialPriceValid(partyPriceRule, targetDate)) {
    return {
      price: Number(baseSellingPrice || 0),
      discountPercent: 0,
      isCustom: false,
    };
  }

  if (partyPriceRule.customPrice !== undefined && partyPriceRule.customPrice !== null && partyPriceRule.customPrice > 0) {
    const custom = Number(partyPriceRule.customPrice);
    const disc = partyPriceRule.discountPercent ? Number(partyPriceRule.discountPercent) : 0;
    const finalPrice = disc > 0 ? Number((custom * (1 - disc / 100)).toFixed(2)) : custom;
    return {
      price: finalPrice,
      discountPercent: disc,
      isCustom: true,
    };
  }

  if (partyPriceRule.discountPercent !== undefined && partyPriceRule.discountPercent !== null && partyPriceRule.discountPercent > 0) {
    const disc = Number(partyPriceRule.discountPercent);
    const effectiveBase = baseSellingPrice > 0 ? baseSellingPrice : baseMrp;
    const discounted = Number((effectiveBase * (1 - disc / 100)).toFixed(2));
    return {
      price: discounted,
      discountPercent: disc,
      isCustom: true,
    };
  }

  return {
    price: Number(baseSellingPrice || 0),
    discountPercent: 0,
    isCustom: false,
  };
}
