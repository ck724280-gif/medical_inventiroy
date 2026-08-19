import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { SalesService } from '../sales/sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { formatCurrency, formatDate, formatDateTime } from '@medical-inventory/shared-utils';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService
  ) {}

  async generatePdfInvoice(invoiceId: string): Promise<Buffer> {
    const sale = await this.salesService.findOne(invoiceId);
    const business = await this.prisma.businessSettings.findUnique({ where: { id: 'default' } });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Banner
      doc.fontSize(18).font('Helvetica-Bold').text(business?.name || 'MedCare Pharmacy', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(
        `${sale.branch.address}, ${sale.branch.city}, ${sale.branch.state} - ${business?.pinZip || ''}`,
        { align: 'center' }
      );
      doc.text(`Phone: ${sale.branch.phone || business?.phone || ''} | Email: ${sale.branch.email || business?.email || ''}`, {
        align: 'center',
      });
      if (business?.gstNumber) {
        doc.text(`GSTIN: ${business.gstNumber} | Drug License: ${business.pharmacyLicense || 'N/A'}`, { align: 'center' });
      }

      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice & Customer Info Box
      const topY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').text('Invoice Details:', 40, topY);
      doc.font('Helvetica').text(`Invoice No: ${sale.invoiceNumber}`, 40, topY + 15);
      doc.text(`Date & Time: ${formatDateTime(sale.createdAt)}`, 40, topY + 28);
      doc.text(`Cashier: ${sale.createdByUser.firstName} ${sale.createdByUser.lastName}`, 40, topY + 41);

      doc.font('Helvetica-Bold').text('Billed To:', 320, topY);
      doc.font('Helvetica').text(`Customer: ${sale.customer?.name || 'Walk-in Customer'}`, 320, topY + 15);
      doc.text(`Mobile: ${sale.customer?.mobile || 'N/A'}`, 320, topY + 28);
      doc.text(`Payment Mode: ${sale.payments.map((p) => p.paymentMode).join(', ')}`, 320, topY + 41);

      doc.moveDown(4);

      // Items Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('#', 40, tableTop, { width: 20 });
      doc.text('Medicine / Product', 65, tableTop, { width: 175 });
      doc.text('Batch', 245, tableTop, { width: 55 });
      doc.text('Exp', 305, tableTop, { width: 45 });
      doc.text('Qty', 355, tableTop, { width: 35, align: 'right' });
      doc.text('MRP', 395, tableTop, { width: 45, align: 'right' });
      doc.text('Rate', 445, tableTop, { width: 45, align: 'right' });
      doc.text('Amount', 495, tableTop, { width: 60, align: 'right' });

      doc.moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).stroke();

      let itemY = tableTop + 20;
      doc.font('Helvetica');

      sale.items.forEach((item, index) => {
        if (itemY > 700) {
          doc.addPage();
          itemY = 40;
        }

        doc.text(String(index + 1), 40, itemY, { width: 20 });
        doc.text(item.medicine.name, 65, itemY, { width: 175 });
        doc.text(item.batch.batchNumber, 245, itemY, { width: 55 });
        doc.text(formatDate(item.batch.expiryDate, 'MM-YYYY'), 305, itemY, { width: 45 });
        doc.text(String(item.qty), 355, itemY, { width: 35, align: 'right' });
        doc.text(item.mrp.toFixed(2), 395, itemY, { width: 45, align: 'right' });
        doc.text(item.rate.toFixed(2), 445, itemY, { width: 45, align: 'right' });
        doc.text(item.lineTotal.toFixed(2), 495, itemY, { width: 60, align: 'right' });

        itemY += 18;
      });

      doc.moveTo(40, itemY).lineTo(555, itemY).stroke();
      itemY += 10;

      // Summary
      doc.font('Helvetica').text('Subtotal:', 380, itemY, { width: 90, align: 'right' });
      doc.text(`₹${sale.subtotal.toFixed(2)}`, 480, itemY, { width: 75, align: 'right' });
      itemY += 14;

      if (sale.discountAmount > 0) {
        doc.text('Discount:', 380, itemY, { width: 90, align: 'right' });
        doc.text(`-₹${sale.discountAmount.toFixed(2)}`, 480, itemY, { width: 75, align: 'right' });
        itemY += 14;
      }

      doc.text('Tax / GST:', 380, itemY, { width: 90, align: 'right' });
      doc.text(`₹${sale.taxAmount.toFixed(2)}`, 480, itemY, { width: 75, align: 'right' });
      itemY += 16;

      doc.font('Helvetica-Bold').fontSize(11).text('Grand Total:', 380, itemY, { width: 90, align: 'right' });
      doc.text(`₹${sale.totalAmount.toFixed(2)}`, 480, itemY, { width: 75, align: 'right' });
      itemY += 30;

      // Terms & Footer
      doc.fontSize(8).font('Helvetica').text(
        'Terms & Conditions: 1. Goods once sold will be returned only within 7 days with original invoice. 2. Refrigerated & Schedule H1 medicines non-returnable.',
        40,
        itemY,
        { width: 515 }
      );
      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('Thank You! Get Well Soon', { align: 'center' });

      doc.end();
    });
  }
}
