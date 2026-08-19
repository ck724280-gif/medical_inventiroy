import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ExcelJS from 'exceljs';
import { calculateGstBreakdown } from '@medical-inventory/shared-utils';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(query: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'medicine' | 'category' | 'user' | 'payment';
  }) {
    const where: any = {
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
    };

    if (query.branchId) where.branchId = query.branchId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await this.prisma.salesInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        branch: true,
        createdByUser: true,
        items: {
          include: {
            medicine: { include: { category: true, baseUnit: true } },
            batch: true,
          },
        },
        payments: true,
      },
    });

    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTaxAmount = sales.reduce((sum, s) => sum + s.taxAmount, 0);
    const totalDiscountAmount = sales.reduce((sum, s) => sum + s.discountAmount, 0);

    return {
      summary: {
        totalInvoices: sales.length,
        totalSalesAmount,
        totalTaxAmount,
        totalDiscountAmount,
      },
      sales,
    };
  }

  async getPurchaseReport(query: {
    branchId?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {
      status: { in: ['CONFIRMED', 'APPROVED'] },
    };

    if (query.branchId) where.branchId = query.branchId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const purchases = await this.prisma.purchaseInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            medicine: true,
          },
        },
        payments: true,
      },
    });

    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      summary: {
        totalInvoices: purchases.length,
        totalPurchasesAmount,
      },
      purchases,
    };
  }

  async getInventoryValuationReport(branchId?: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        baseUnit: true,
        category: true,
        manufacturer: true,
        batches: {
          where: {
            currentQty: { gt: 0 },
            ...(branchId ? { branchId } : {}),
          },
        },
      },
    });

    let totalStockQty = 0;
    let totalPurchaseValuation = 0;
    let totalMrpValuation = 0;

    const items = medicines.map((m) => {
      const stock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      const purchaseValue = m.batches.reduce((sum, b) => sum + b.currentQty * b.purchasePrice, 0);
      const mrpValue = m.batches.reduce((sum, b) => sum + b.currentQty * b.mrp, 0);

      totalStockQty += stock;
      totalPurchaseValuation += purchaseValue;
      totalMrpValuation += mrpValue;

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        sku: m.sku,
        category: m.category?.name || 'Uncategorized',
        manufacturer: m.manufacturer?.name || 'N/A',
        unit: m.baseUnit?.abbreviation || 'PCS',
        stock,
        purchaseValue,
        mrpValue,
        batchesCount: m.batches.length,
      };
    });

    return {
      summary: {
        totalMedicines: items.length,
        totalStockQty,
        totalPurchaseValuation,
        totalMrpValuation,
        potentialProfit: totalMrpValuation - totalPurchaseValuation,
      },
      items,
    };
  }

  // --- GST REPORTS ---
  async getGstr1Report(query: { branchId?: string; startDate?: string; endDate?: string }) {
    const where: any = {
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
    };
    if (query.branchId) where.branchId = query.branchId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await this.prisma.salesInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        branch: true,
        items: {
          include: { medicine: true },
        },
      },
    });

    const b2bInvoices: any[] = [];
    const b2cInvoices: any[] = [];

    let totalB2bTaxable = 0;
    let totalB2bTax = 0;
    let totalB2cTaxable = 0;
    let totalB2cTax = 0;

    for (const sale of sales) {
      const hasGstin = Boolean(sale.customerGstin || (sale.customer && (sale.customer as any).gstNumber));
      const taxable = sale.subtotal - sale.discountAmount;
      const tax = sale.taxAmount;

      const record = {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt,
        customerName: sale.customer?.name || 'Walk-in Customer',
        gstin: sale.customerGstin || (sale.customer as any)?.gstNumber || null,
        taxableValue: taxable,
        cgst: Number((tax / 2).toFixed(2)),
        sgst: Number((tax / 2).toFixed(2)),
        igst: 0,
        totalTax: tax,
        invoiceValue: sale.totalAmount,
      };

      if (hasGstin || sale.isB2B) {
        b2bInvoices.push(record);
        totalB2bTaxable += taxable;
        totalB2bTax += tax;
      } else {
        b2cInvoices.push(record);
        totalB2cTaxable += taxable;
        totalB2cTax += tax;
      }
    }

    return {
      summary: {
        totalInvoices: sales.length,
        b2bCount: b2bInvoices.length,
        b2cCount: b2cInvoices.length,
        totalB2bTaxable: Number(totalB2bTaxable.toFixed(2)),
        totalB2bTax: Number(totalB2bTax = totalB2bTax),
        totalB2cTaxable: Number(totalB2cTaxable.toFixed(2)),
        totalB2cTax: Number(totalB2cTax.toFixed(2)),
        grandTotalTaxable: Number((totalB2bTaxable + totalB2cTaxable).toFixed(2)),
        grandTotalTax: Number((totalB2bTax + totalB2cTax).toFixed(2)),
      },
      b2b: b2bInvoices,
      b2c: b2cInvoices,
    };
  }

  async getGstr3bReport(query: { branchId?: string; startDate?: string; endDate?: string }) {
    const salesReport = await this.getGstr1Report(query);
    const purchaseWhere: any = {
      status: { in: ['CONFIRMED', 'APPROVED'] },
    };
    if (query.branchId) purchaseWhere.branchId = query.branchId;
    if (query.startDate || query.endDate) {
      purchaseWhere.createdAt = {};
      if (query.startDate) purchaseWhere.createdAt.gte = new Date(query.startDate);
      if (query.endDate) purchaseWhere.createdAt.lte = new Date(query.endDate);
    }

    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: purchaseWhere,
      include: { supplier: true },
    });

    const outwardTaxable = salesReport.summary.grandTotalTaxable;
    const outwardTax = salesReport.summary.grandTotalTax;
    const outwardCgst = Number((outwardTax / 2).toFixed(2));
    const outwardSgst = Number((outwardTax / 2).toFixed(2));

    let inwardTaxable = 0;
    let inwardTax = 0;

    for (const p of purchases) {
      inwardTaxable += p.subtotal - p.discountAmount;
      inwardTax += p.taxAmount;
    }

    const itcCgst = Number((inwardTax / 2).toFixed(2));
    const itcSgst = Number((inwardTax / 2).toFixed(2));

    const netCgstPayable = Number(Math.max(0, outwardCgst - itcCgst).toFixed(2));
    const netSgstPayable = Number(Math.max(0, outwardSgst - itcSgst).toFixed(2));
    const totalNetPayable = Number((netCgstPayable + netSgstPayable).toFixed(2));

    return {
      outwardSupplies: {
        taxableValue: outwardTaxable,
        cgst: outwardCgst,
        sgst: outwardSgst,
        igst: 0,
        totalTax: outwardTax,
      },
      eligibleItc: {
        taxableValue: Number(inwardTaxable.toFixed(2)),
        cgst: itcCgst,
        sgst: itcSgst,
        igst: 0,
        totalTax: Number(inwardTax.toFixed(2)),
      },
      netGstPayable: {
        cgst: netCgstPayable,
        sgst: netSgstPayable,
        igst: 0,
        totalNetPayable,
      },
    };
  }

  async getHsnSummaryReport(query: { branchId?: string; startDate?: string; endDate?: string }) {
    const where: any = {
      salesInvoice: {
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
    };
    if (query.startDate || query.endDate) {
      where.salesInvoice.createdAt = {};
      if (query.startDate) where.salesInvoice.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.salesInvoice.createdAt.lte = new Date(query.endDate);
    }

    const salesItems = await this.prisma.salesItem.findMany({
      where,
      include: {
        medicine: true,
        salesInvoice: true,
      },
    });

    const hsnMap: { [key: string]: any } = {};

    for (const item of salesItems) {
      const hsn = item.medicine.hsnCode || '30049099';
      const rate = item.taxPercent || item.medicine.taxPercent || 12;
      const key = `${hsn}_${rate}`;

      if (!hsnMap[key]) {
        hsnMap[key] = {
          hsnCode: hsn,
          taxPercent: rate,
          medicineName: item.medicine.name,
          totalQty: 0,
          totalValue: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
      }

      const taxable = item.lineTotal / (1 + rate / 100);
      const tax = item.lineTotal - taxable;

      hsnMap[key].totalQty += item.qty;
      hsnMap[key].totalValue += item.lineTotal;
      hsnMap[key].taxableValue += taxable;
      hsnMap[key].cgst += tax / 2;
      hsnMap[key].sgst += tax / 2;
      hsnMap[key].totalTax += tax;
    }

    const hsnItems = Object.values(hsnMap).map((h: any) => ({
      hsnCode: h.hsnCode,
      taxPercent: h.taxPercent,
      description: h.medicineName,
      totalQty: h.totalQty,
      totalValue: Number(h.totalValue.toFixed(2)),
      taxableValue: Number(h.taxableValue.toFixed(2)),
      cgst: Number(h.cgst.toFixed(2)),
      sgst: Number(h.sgst.toFixed(2)),
      igst: 0,
      totalTax: Number(h.totalTax.toFixed(2)),
    }));

    return {
      summary: {
        totalHsnCategories: hsnItems.length,
        totalQuantity: hsnItems.reduce((s, i) => s + i.totalQty, 0),
        totalTaxableValue: Number(hsnItems.reduce((s, i) => s + i.taxableValue, 0).toFixed(2)),
        totalTax: Number(hsnItems.reduce((s, i) => s + i.totalTax, 0).toFixed(2)),
      },
      items: hsnItems,
    };
  }

  // --- SCHEDULE H REGISTER ---
  async getScheduleHReport(query: { branchId?: string; startDate?: string; endDate?: string; schedule?: string }) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    if (query.schedule) {
      where.drugSchedule = query.schedule;
    }

    const prescriptions = await this.prisma.prescriptionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        salesInvoice: {
          include: {
            items: {
              include: {
                medicine: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    const records = prescriptions.map((p) => {
      const controlledItems = p.salesInvoice.items.filter(
        (i) => i.medicine.isScheduleH || i.medicine.isScheduleH1 || i.medicine.isScheduleX || (i.medicine as any).drugSchedule !== 'OTC'
      );

      return {
        id: p.id,
        dispensedAt: p.dispensedAt || p.createdAt,
        invoiceNumber: p.salesInvoice.invoiceNumber,
        doctorName: p.doctorName,
        doctorRegNo: p.doctorRegNo,
        patientName: p.patientName,
        patientAge: p.patientAge,
        patientAddress: p.patientAddress,
        prescriptionNumber: p.prescriptionNumber,
        drugSchedule: p.drugSchedule,
        items: (controlledItems.length > 0 ? controlledItems : p.salesInvoice.items).map((i) => ({
          medicineName: i.medicine.name,
          batchNumber: i.batch?.batchNumber || 'N/A',
          expiryDate: i.batch?.expiryDate,
          qty: i.qty,
        })),
      };
    });

    return {
      totalRecords: records.length,
      records,
    };
  }

  // --- EXCEL EXPORTS ---
  async exportGstr1Excel(query: any): Promise<Buffer> {
    const report = await this.getGstr1Report(query);
    const workbook = new ExcelJS.Workbook();
    const sheetB2B = workbook.addWorksheet('B2B Invoices');
    const sheetB2C = workbook.addWorksheet('B2C Summary');

    sheetB2B.columns = [
      { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Taxable (₹)', key: 'taxableValue', width: 15 },
      { header: 'CGST (₹)', key: 'cgst', width: 12 },
      { header: 'SGST (₹)', key: 'sgst', width: 12 },
      { header: 'Total Tax (₹)', key: 'totalTax', width: 15 },
      { header: 'Invoice Total (₹)', key: 'invoiceValue', width: 18 },
    ];

    report.b2b.forEach((item) => sheetB2B.addRow(item));

    sheetB2C.columns = [
      { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Taxable (₹)', key: 'taxableValue', width: 15 },
      { header: 'CGST (₹)', key: 'cgst', width: 12 },
      { header: 'SGST (₹)', key: 'sgst', width: 12 },
      { header: 'Total Tax (₹)', key: 'totalTax', width: 15 },
      { header: 'Invoice Total (₹)', key: 'invoiceValue', width: 18 },
    ];

    report.b2c.forEach((item) => sheetB2C.addRow(item));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportScheduleHExcel(query: any): Promise<Buffer> {
    const report = await this.getScheduleHReport(query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Schedule H Register');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
      { header: 'Patient Name', key: 'patientName', width: 20 },
      { header: 'Age', key: 'patientAge', width: 8 },
      { header: 'Doctor Name', key: 'doctorName', width: 22 },
      { header: 'Doctor Reg No', key: 'doctorRegNo', width: 18 },
      { header: 'Rx Ref No', key: 'prescriptionNumber', width: 15 },
      { header: 'Schedule', key: 'drugSchedule', width: 15 },
      { header: 'Medicine Dispensed', key: 'medicines', width: 30 },
      { header: 'Batch', key: 'batches', width: 15 },
      { header: 'Qty', key: 'qty', width: 10 },
    ];

    report.records.forEach((r) => {
      sheet.addRow({
        date: new Date(r.dispensedAt).toLocaleDateString(),
        invoiceNumber: r.invoiceNumber,
        patientName: r.patientName,
        patientAge: r.patientAge,
        doctorName: r.doctorName,
        doctorRegNo: r.doctorRegNo,
        prescriptionNumber: r.prescriptionNumber || 'N/A',
        drugSchedule: r.drugSchedule,
        medicines: r.items.map((i) => i.medicineName).join(', '),
        batches: r.items.map((i) => i.batchNumber).join(', '),
        qty: r.items.map((i) => i.qty).join(', '),
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportInventoryExcel(branchId?: string): Promise<Buffer> {
    const report = await this.getInventoryValuationReport(branchId);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Valuation');

    worksheet.columns = [
      { header: 'Medicine Name', key: 'name', width: 30 },
      { header: 'Generic Name', key: 'genericName', width: 25 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Stock Qty', key: 'stock', width: 12 },
      { header: 'Purchase Value (₹)', key: 'purchaseValue', width: 18 },
      { header: 'MRP Value (₹)', key: 'mrpValue', width: 18 },
    ];

    report.items.forEach((item) => {
      worksheet.addRow({
        name: item.name,
        genericName: item.genericName || '',
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        stock: item.stock,
        purchaseValue: Number(item.purchaseValue.toFixed(2)),
        mrpValue: Number(item.mrpValue.toFixed(2)),
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
