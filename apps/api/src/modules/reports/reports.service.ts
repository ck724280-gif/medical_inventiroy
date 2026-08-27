import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ExcelJS from 'exceljs';
import { calculateGstBreakdown } from '@medical-inventory/shared-utils';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    const filter: any = {};
    if (startDate) {
      const s = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
      s.setUTCHours(0, 0, 0, 0);
      filter.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
      e.setUTCHours(23, 59, 59, 999);
      filter.lte = e;
    }
    return filter;
  }

  async getSalesReport(query: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'medicine' | 'category' | 'user' | 'payment';
  }) {
    const where: any = {
      status: { not: 'CANCELLED' },
    };

    if (query.branchId && query.branchId !== 'all') where.branchId = query.branchId;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.createdAt = dateFilter;

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
      status: { not: 'CANCELLED' },
    };

    if (query.branchId && query.branchId !== 'all') where.branchId = query.branchId;
    if (query.supplierId) where.supplierId = query.supplierId;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.createdAt = dateFilter;

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
          where: branchId && branchId !== 'all' && branchId !== 'ALL'
            ? { branchId }
            : {},
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
      status: { not: 'CANCELLED' },
    };
    if (query.branchId && query.branchId !== 'all') where.branchId = query.branchId;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.createdAt = dateFilter;

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
        totalB2bTax: Number(totalB2bTax),
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
      status: { not: 'CANCELLED' },
    };
    if (query.branchId && query.branchId !== 'all') purchaseWhere.branchId = query.branchId;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) purchaseWhere.createdAt = dateFilter;

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
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    const where: any = {
      salesInvoice: {
        status: { not: 'CANCELLED' },
        ...(query.branchId && query.branchId !== 'all' ? { branchId: query.branchId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    };

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
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.createdAt = dateFilter;
    if (query.branchId && query.branchId !== 'all') {
      where.salesInvoice = { branchId: query.branchId };
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

  async getFinancialSummaryReport(query: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const salesReport = await this.getSalesReport(query);
    const purchaseReport = await this.getPurchaseReport(query);

    // Operational expenses in the same timeframe
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    const expenseWhere: any = {};
    if (query.branchId && query.branchId !== 'all') expenseWhere.branchId = query.branchId;
    if (dateFilter) expenseWhere.date = dateFilter;
    const expenses = await this.prisma.expense.findMany({ where: expenseWhere });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Sales Returns
    const returnWhere: any = {};
    if (query.branchId && query.branchId !== 'all') returnWhere.branchId = query.branchId;
    if (dateFilter) returnWhere.createdAt = dateFilter;
    const returns = await this.prisma.salesReturn.findMany({ where: returnWhere });
    const totalReturnsAmount = returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const grossRevenue = salesReport.summary.totalSalesAmount;
    const netRevenue = Math.max(0, grossRevenue - totalReturnsAmount);

    // Approximate COGS from sales item batches purchasePrice
    let cogs = 0;
    for (const sale of salesReport.sales) {
      for (const item of sale.items) {
        const costPerUnit =
          item.batch?.purchasePrice ||
          (item.medicine as any)?.purchasePrice ||
          (item.lineTotal / (item.qty || 1)) * 0.7;
        cogs += item.qty * costPerUnit;
      }
    }

    const grossProfit = Number((netRevenue - cogs).toFixed(2));
    const netProfitEstimate = Number((grossProfit - totalExpenses).toFixed(2));
    const profitMargin = netRevenue > 0 ? Number(((netProfitEstimate / netRevenue) * 100).toFixed(2)) : 0;

    return {
      totalRevenue: grossRevenue,
      grossSales: grossRevenue,
      totalReturns: totalReturnsAmount,
      netRevenue,
      cogs: Number(cogs.toFixed(2)),
      grossProfit,
      totalExpenses,
      netProfitEstimate,
      profitMargin,
      totalInvoices: salesReport.summary.totalInvoices,
      totalPurchases: purchaseReport.summary.totalPurchasesAmount,
    };
  }

  async exportSalesExcel(query: any): Promise<Buffer> {
    const report = await this.getSalesReport(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Ledger');

    worksheet.columns = [
      { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
      { header: 'Tax (₹)', key: 'taxAmount', width: 12 },
      { header: 'Discount (₹)', key: 'discountAmount', width: 12 },
      { header: 'Total (₹)', key: 'totalAmount', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    report.sales.forEach((s) => {
      worksheet.addRow({
        invoiceNumber: s.invoiceNumber,
        date: new Date(s.createdAt).toLocaleDateString(),
        customerName: s.customer?.name || 'Walk-in',
        paymentMethod: s.payments?.[0]?.paymentMode || 'CASH',
        subtotal: Number(s.subtotal.toFixed(2)),
        taxAmount: Number(s.taxAmount.toFixed(2)),
        discountAmount: Number(s.discountAmount.toFixed(2)),
        totalAmount: Number(s.totalAmount.toFixed(2)),
        status: s.status,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportPurchasesExcel(query: any): Promise<Buffer> {
    const report = await this.getPurchaseReport(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Purchase Ledger');

    worksheet.columns = [
      { header: 'Invoice / Bill No', key: 'invoiceNumber', width: 20 },
      { header: 'Purchase Date', key: 'date', width: 15 },
      { header: 'Supplier / Vendor', key: 'supplierName', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
      { header: 'Tax / GST (₹)', key: 'taxAmount', width: 15 },
      { header: 'Discount (₹)', key: 'discountAmount', width: 15 },
      { header: 'Total Bill (₹)', key: 'totalAmount', width: 18 },
      { header: 'Payment Status', key: 'paymentStatus', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    report.purchases.forEach((p: any) => {
      worksheet.addRow({
        invoiceNumber: p.invoiceNumber,
        date: new Date(p.purchaseDate || p.createdAt).toLocaleDateString(),
        supplierName: p.supplier?.name || 'Direct Vendor',
        gstin: p.supplier?.gstNumber || 'N/A',
        subtotal: Number((p.subtotal || p.totalAmount).toFixed(2)),
        taxAmount: Number((p.taxAmount || 0).toFixed(2)),
        discountAmount: Number((p.discountAmount || 0).toFixed(2)),
        totalAmount: Number(p.totalAmount.toFixed(2)),
        paymentStatus: p.paymentStatus || 'PAID',
        status: p.status,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportGstr3bExcel(query: any): Promise<Buffer> {
    const report = await this.getGstr3bReport(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GSTR-3B');

    worksheet.columns = [
      { header: 'Section', key: 'section', width: 35 },
      { header: 'Taxable Value (₹)', key: 'taxableValue', width: 20 },
      { header: 'CGST (₹)', key: 'cgst', width: 15 },
      { header: 'SGST (₹)', key: 'sgst', width: 15 },
      { header: 'IGST (₹)', key: 'igst', width: 15 },
      { header: 'Total Tax (₹)', key: 'totalTax', width: 20 },
    ];

    worksheet.addRow({
      section: '3.1 Outward Supplies (Sales)',
      taxableValue: report.outwardSupplies.taxableValue,
      cgst: report.outwardSupplies.cgst,
      sgst: report.outwardSupplies.sgst,
      igst: report.outwardSupplies.igst,
      totalTax: report.outwardSupplies.totalTax,
    });

    worksheet.addRow({
      section: '4. Eligible Input Tax Credit (Purchases)',
      taxableValue: report.eligibleItc.taxableValue,
      cgst: report.eligibleItc.cgst,
      sgst: report.eligibleItc.sgst,
      igst: report.eligibleItc.igst,
      totalTax: report.eligibleItc.totalTax,
    });

    worksheet.addRow({
      section: 'Net GST Payable to Government',
      taxableValue: '—',
      cgst: report.netGstPayable.cgst,
      sgst: report.netGstPayable.sgst,
      igst: report.netGstPayable.igst,
      totalTax: report.netGstPayable.totalNetPayable,
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportHsnSummaryExcel(query: any): Promise<Buffer> {
    const report = await this.getHsnSummaryReport(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('HSN Summary');

    worksheet.columns = [
      { header: 'HSN Code', key: 'hsnCode', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Tax Rate (%)', key: 'taxPercent', width: 15 },
      { header: 'Total Qty', key: 'totalQty', width: 12 },
      { header: 'Taxable Value (₹)', key: 'taxableValue', width: 18 },
      { header: 'CGST (₹)', key: 'cgst', width: 12 },
      { header: 'SGST (₹)', key: 'sgst', width: 12 },
      { header: 'Total Tax (₹)', key: 'totalTax', width: 15 },
      { header: 'Total Value (₹)', key: 'totalValue', width: 18 },
    ];

    report.items.forEach((item) => {
      worksheet.addRow({
        hsnCode: item.hsnCode,
        description: item.description,
        taxPercent: `${item.taxPercent}%`,
        totalQty: item.totalQty,
        taxableValue: item.taxableValue,
        cgst: item.cgst,
        sgst: item.sgst,
        totalTax: item.totalTax,
        totalValue: item.totalValue,
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
