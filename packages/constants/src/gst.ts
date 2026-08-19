export interface TaxSlab {
  name: string;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export const DEFAULT_TAX_SLABS: TaxSlab[] = [
  { name: 'Exempted (0%)', rate: 0, cgst: 0, sgst: 0, igst: 0 },
  { name: 'GST 5%', rate: 5, cgst: 2.5, sgst: 2.5, igst: 5 },
  { name: 'GST 12%', rate: 12, cgst: 6, sgst: 6, igst: 12 },
  { name: 'GST 18%', rate: 18, cgst: 9, sgst: 9, igst: 18 },
  { name: 'GST 28%', rate: 28, cgst: 14, sgst: 14, igst: 28 },
];

export const STANDARD_UNITS = [
  { name: 'Tablet', abbreviation: 'TAB' },
  { name: 'Capsule', abbreviation: 'CAP' },
  { name: 'Strip', abbreviation: 'STRIP' },
  { name: 'Box', abbreviation: 'BOX' },
  { name: 'Bottle', abbreviation: 'BTL' },
  { name: 'Vial', abbreviation: 'VIAL' },
  { name: 'Ampoule', abbreviation: 'AMP' },
  { name: 'Tube', abbreviation: 'TUBE' },
  { name: 'Sachet', abbreviation: 'SACHET' },
  { name: 'Piece', abbreviation: 'PCS' },
  { name: 'Carton', abbreviation: 'CTN' },
];
