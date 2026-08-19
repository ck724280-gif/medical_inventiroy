export interface ThermalLabelData {
  medicineName: string;
  genericName?: string;
  batchNumber: string;
  mfgDate?: string | Date;
  expiryDate: string | Date;
  mrp: number;
  barcode: string;
  pharmacyName?: string;
}

export function formatLabelDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function generateThermalLabelHtml(data: ThermalLabelData): string {
  const expStr = formatLabelDate(data.expiryDate);
  const mfgStr = data.mfgDate ? formatLabelDate(data.mfgDate) : '';
  const cleanName = (data.medicineName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const truncatedName = cleanName.length > 28 ? cleanName.substring(0, 26) + '...' : cleanName;

  return `
<div class="thermal-label-40x20">
  <div class="label-header">
    <span class="med-name">${truncatedName}</span>
  </div>
  <div class="label-body">
    <div class="label-meta">
      <span>B.No: <b>${data.batchNumber}</b></span>
      <span>EXP: <b>${expStr}</b></span>
    </div>
    <div class="label-price">
      <span>MRP: <b>₹${Number(data.mrp || 0).toFixed(2)}</b></span>
      ${mfgStr ? `<span>MFG: ${mfgStr}</span>` : ''}
    </div>
  </div>
  <div class="label-barcode-svg">
    <svg class="barcode-target" data-barcode="${data.barcode || data.batchNumber}"></svg>
  </div>
</div>
`;
}
