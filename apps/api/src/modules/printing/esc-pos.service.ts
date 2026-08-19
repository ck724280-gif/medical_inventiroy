import { Injectable } from '@nestjs/common';
import { ThermalReceiptDataDto, PaperWidth } from '@medical-inventory/shared-types';

@Injectable()
export class EscPosService {
  /**
   * Generates ESC/POS byte commands for standard 58mm and 80mm thermal receipt printers.
   */
  generateEscPosCommands(data: ThermalReceiptDataDto): Buffer {
    const is80mm = data.paperWidth === PaperWidth.WIDTH_80MM;
    const lineWidth = is80mm ? 48 : 32;

    const ESC = 0x1b;
    const GS = 0x1d;

    const buffers: Buffer[] = [];

    // Initialize printer
    buffers.push(Buffer.from([ESC, 0x40]));

    // Center alignment
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));

    // Double-height Store Name
    buffers.push(Buffer.from([ESC, 0x21, 0x10])); // Double height
    buffers.push(Buffer.from(`${data.storeName}\n`, 'utf-8'));
    buffers.push(Buffer.from([ESC, 0x21, 0x00])); // Normal size

    // Address & Contact
    if (data.address) buffers.push(Buffer.from(`${data.address}\n`, 'utf-8'));
    if (data.phone) buffers.push(Buffer.from(`Phone: ${data.phone}\n`, 'utf-8'));
    if (data.gstNumber) buffers.push(Buffer.from(`GSTIN: ${data.gstNumber}\n`, 'utf-8'));
    if (data.pharmacyLicense) buffers.push(Buffer.from(`D.L. No: ${data.pharmacyLicense}\n`, 'utf-8'));

    // Divider
    buffers.push(Buffer.from(`${'-'.repeat(lineWidth)}\n`, 'utf-8'));

    // Left alignment for invoice metadata
    buffers.push(Buffer.from([ESC, 0x61, 0x00]));
    buffers.push(Buffer.from(`Invoice: ${data.invoiceNumber}\n`, 'utf-8'));
    buffers.push(Buffer.from(`Date: ${data.date}  Time: ${data.time}\n`, 'utf-8'));
    buffers.push(Buffer.from(`Cashier: ${data.cashierName}\n`, 'utf-8'));
    if (data.customerName) buffers.push(Buffer.from(`Customer: ${data.customerName}\n`, 'utf-8'));
    if (data.customerMobile) buffers.push(Buffer.from(`Mobile: ${data.customerMobile}\n`, 'utf-8'));

    // Divider
    buffers.push(Buffer.from(`${'-'.repeat(lineWidth)}\n`, 'utf-8'));

    // Table Header
    if (is80mm) {
      buffers.push(Buffer.from(this.formatRow80('Item', 'Batch', 'Qty', 'Rate', 'Amount') + '\n', 'utf-8'));
    } else {
      buffers.push(Buffer.from(this.formatRow58('Item', 'Qty', 'Rate', 'Amount') + '\n', 'utf-8'));
    }
    buffers.push(Buffer.from(`${'-'.repeat(lineWidth)}\n`, 'utf-8'));

    // Items
    for (const item of data.items) {
      const itemTitle = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name;
      if (is80mm) {
        buffers.push(
          Buffer.from(
            this.formatRow80(
              itemTitle,
              item.batch,
              `${item.qty} ${item.unit}`,
              item.rate.toFixed(2),
              item.amount.toFixed(2)
            ) + '\n',
            'utf-8'
          )
        );
      } else {
        buffers.push(
          Buffer.from(
            this.formatRow58(
              itemTitle,
              `${item.qty}`,
              item.rate.toFixed(2),
              item.amount.toFixed(2)
            ) + '\n',
            'utf-8'
          )
        );
      }
    }

    // Divider
    buffers.push(Buffer.from(`${'-'.repeat(lineWidth)}\n`, 'utf-8'));

    // Totals
    buffers.push(Buffer.from(this.formatSummaryRow('Subtotal:', data.subtotal.toFixed(2), lineWidth) + '\n', 'utf-8'));
    if (data.discountTotal > 0) {
      buffers.push(Buffer.from(this.formatSummaryRow('Discount:', `-${data.discountTotal.toFixed(2)}`, lineWidth) + '\n', 'utf-8'));
    }
    buffers.push(Buffer.from(this.formatSummaryRow('Tax/GST:', data.taxTotal.toFixed(2), lineWidth) + '\n', 'utf-8'));

    // Bold Grand Total
    buffers.push(Buffer.from([ESC, 0x45, 0x01])); // Bold on
    buffers.push(Buffer.from(this.formatSummaryRow('GRAND TOTAL:', `Rs. ${data.grandTotal.toFixed(2)}`, lineWidth) + '\n', 'utf-8'));
    buffers.push(Buffer.from([ESC, 0x45, 0x00])); // Bold off

    buffers.push(Buffer.from(`${'-'.repeat(lineWidth)}\n`, 'utf-8'));
    buffers.push(Buffer.from(`Payment: ${data.paymentMode}\n`, 'utf-8'));

    // Center alignment for Footer
    buffers.push(Buffer.from([ESC, 0x61, 0x01]));
    buffers.push(Buffer.from(`\n${data.thankYouMessage || 'Thank You! Get Well Soon'}\n`, 'utf-8'));
    if (data.returnPolicy) {
      buffers.push(Buffer.from(`${data.returnPolicy}\n`, 'utf-8'));
    }

    // Feed lines & cut paper (GS V 66 0)
    buffers.push(Buffer.from([ESC, 0x64, 0x04])); // Feed 4 lines
    buffers.push(Buffer.from([GS, 0x56, 0x42, 0x00])); // Partial cut

    return Buffer.concat(buffers);
  }

  private formatRow58(col1: string, col2: string, col3: string, col4: string): string {
    const c1 = col1.padEnd(12).substring(0, 12);
    const c2 = col2.padStart(4).substring(0, 4);
    const c3 = col3.padStart(7).substring(0, 7);
    const c4 = col4.padStart(8).substring(0, 8);
    return `${c1} ${c2} ${c3} ${c4}`;
  }

  private formatRow80(col1: string, col2: string, col3: string, col4: string, col5: string): string {
    const c1 = col1.padEnd(16).substring(0, 16);
    const c2 = col2.padEnd(8).substring(0, 8);
    const c3 = col3.padStart(6).substring(0, 6);
    const c4 = col4.padStart(8).substring(0, 8);
    const c5 = col5.padStart(8).substring(0, 8);
    return `${c1} ${c2} ${c3} ${c4} ${c5}`;
  }

  private formatSummaryRow(label: string, value: string, width: number): string {
    const space = width - label.length - value.length;
    return `${label}${' '.repeat(Math.max(1, space))}${value}`;
  }
}
