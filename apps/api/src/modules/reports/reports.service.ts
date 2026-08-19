import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ExcelJS from 'exceljs';
import { formatDate } from '@medical-inventory/shared-utils';

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
        unit: m.baseUnit.abbreviation,
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

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }
}
