export interface MedicineUnitConfig {
  stripsPerBox?: number;
  tabletsPerStrip?: number;
}

export function convertToBaseUnits(
  qty: number,
  unitLevel: string,
  stripsPerBox: number = 10,
  tabletsPerStrip: number = 10
): number {
  if (!qty || isNaN(qty)) return 0;
  const spb = stripsPerBox > 0 ? stripsPerBox : 10;
  const tps = tabletsPerStrip > 0 ? tabletsPerStrip : 10;

  const normalized = (unitLevel || '').toUpperCase().trim();

  switch (normalized) {
    case 'BOX':
    case 'BOXES':
      return Math.round(qty * spb * tps);
    case 'STRIP':
    case 'STRIPS':
      return Math.round(qty * tps);
    case 'TABLET':
    case 'TABLETS':
    case 'CAPSULE':
    case 'CAPSULES':
    case 'LOOSE':
    case 'UNIT':
    case 'PIECE':
    case 'PCS':
    default:
      return Math.round(qty);
  }
}

export function convertFromBaseUnits(
  baseUnits: number,
  targetUnit: string,
  stripsPerBox: number = 10,
  tabletsPerStrip: number = 10
): number {
  if (!baseUnits || isNaN(baseUnits)) return 0;
  const spb = stripsPerBox > 0 ? stripsPerBox : 10;
  const tps = tabletsPerStrip > 0 ? tabletsPerStrip : 10;

  const normalized = (targetUnit || '').toUpperCase().trim();

  switch (normalized) {
    case 'BOX':
    case 'BOXES':
      return baseUnits / (spb * tps);
    case 'STRIP':
    case 'STRIPS':
      return baseUnits / tps;
    case 'TABLET':
    case 'TABLETS':
    case 'LOOSE':
    case 'UNIT':
    default:
      return baseUnits;
  }
}

export function calculateUnitPriceForUnit(
  baseTabletPrice: number,
  unitLevel: string,
  stripsPerBox: number = 10,
  tabletsPerStrip: number = 10
): number {
  const spb = stripsPerBox > 0 ? stripsPerBox : 10;
  const tps = tabletsPerStrip > 0 ? tabletsPerStrip : 10;
  const normalized = (unitLevel || '').toUpperCase().trim();

  switch (normalized) {
    case 'BOX':
    case 'BOXES':
      return Number((baseTabletPrice * spb * tps).toFixed(2));
    case 'STRIP':
    case 'STRIPS':
      return Number((baseTabletPrice * tps).toFixed(2));
    case 'TABLET':
    case 'TABLETS':
    case 'LOOSE':
    default:
      return Number(baseTabletPrice.toFixed(2));
  }
}

export function formatPackagingDisplay(
  totalBaseUnits: number,
  stripsPerBox: number = 10,
  tabletsPerStrip: number = 10
): string {
  const spb = stripsPerBox > 0 ? stripsPerBox : 10;
  const tps = tabletsPerStrip > 0 ? tabletsPerStrip : 10;
  const boxUnits = spb * tps;

  const boxes = Math.floor(totalBaseUnits / boxUnits);
  const remainingAfterBoxes = totalBaseUnits % boxUnits;
  const strips = Math.floor(remainingAfterBoxes / tps);
  const tablets = remainingAfterBoxes % tps;

  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} Box${boxes > 1 ? 'es' : ''}`);
  if (strips > 0) parts.push(`${strips} Strip${strips > 1 ? 's' : ''}`);
  if (tablets > 0 || parts.length === 0) parts.push(`${tablets} Tab${tablets > 1 ? 's' : ''}`);

  return parts.join(', ');
}
