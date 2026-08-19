import { BarcodeType } from '@medical-inventory/shared-types';

export interface ParsedBarcodeData {
  rawValue: string;
  type: BarcodeType;
  gtin?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
}

/**
 * Detects the barcode standard from a string.
 */
export function detectBarcodeType(code: string): BarcodeType {
  const clean = code.trim();
  if (/^\d{13}$/.test(clean)) return BarcodeType.EAN13;
  if (/^\d{12}$/.test(clean)) return BarcodeType.UPC_A;
  if (/^\d{8}$/.test(clean)) return BarcodeType.EAN8;
  if (/^\d{6}$/.test(clean)) return BarcodeType.UPC_E;
  if (clean.startsWith('01') && clean.length > 20) return BarcodeType.DATAMATRIX;
  if (clean.includes('{') || clean.includes('|')) return BarcodeType.QR;
  return BarcodeType.CODE128;
}

/**
 * Parses GS1 DataMatrix or standard barcodes if additional fields exist.
 */
export function parseBarcode(rawCode: string): ParsedBarcodeData {
  const code = rawCode.trim();
  const type = detectBarcodeType(code);

  // If GS1 DataMatrix (e.g. 01089012345678901726081910BATCH123)
  if (type === BarcodeType.DATAMATRIX && code.startsWith('01')) {
    let gtin: string | undefined;
    let expiryDate: string | undefined;
    let batchNumber: string | undefined;

    // (01) GTIN - 14 digits
    if (code.length >= 16) {
      gtin = code.substring(2, 16);
      let pos = 16;

      // (17) Expiry Date - YYMMDD
      if (code.substring(pos, pos + 2) === '17' && code.length >= pos + 8) {
        const yymmdd = code.substring(pos + 2, pos + 8);
        const yy = parseInt(yymmdd.substring(0, 2), 10);
        const mm = yymmdd.substring(2, 4);
        const dd = yymmdd.substring(4, 6);
        const year = 2000 + yy;
        expiryDate = `${year}-${mm}-${dd}`;
        pos += 8;
      }

      // (10) Batch number - variable length (up to 20 chars)
      if (code.substring(pos, pos + 2) === '10') {
        batchNumber = code.substring(pos + 2);
      }
    }

    return {
      rawValue: rawCode,
      type,
      gtin,
      expiryDate,
      batchNumber,
    };
  }

  return {
    rawValue: rawCode,
    type,
    gtin: code,
  };
}

/**
 * Generates an internal EAN-13 compatible barcode string with check digit.
 */
export function generateInternalBarcode(uniqueIdNumber: number): string {
  // Use prefix 200 (internal in-store retail range)
  const prefix = '200';
  const body = String(uniqueIdNumber).padStart(9, '0').slice(-9);
  const base12 = `${prefix}${body}`;

  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i]!, 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${base12}${checkDigit}`;
}
