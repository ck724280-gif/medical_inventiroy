import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereBranch = branchId ? { branchId } : {};

    // 1. Today's Sales
    const todaySales = await this.prisma.salesInvoice.findMany({
      where: {
        ...whereBranch,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        createdAt: { gte: today },
      },
      include: {
        items: {
          include: {
            batch: { select: { purchasePrice: true } },
          },
        },
      },
    });

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const todaySalesCount = todaySales.length;

    let todayCogs = 0;
    for (const s of todaySales) {
      for (const item of s.items) {
        todayCogs += (item.batch?.purchasePrice || 0) * item.qty;
      }
    }
    const todayGrossProfit = todaySalesTotal - todayCogs;

    // 2. Today's Purchases
    const todayPurchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        ...whereBranch,
        status: { in: ['CONFIRMED', 'APPROVED'] },
        createdAt: { gte: today },
      },
    });
    const todayPurchasesTotal = todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // 3. Current Stock Valuation & Batch Counts
    const batches = await this.prisma.batch.findMany({
      where: {
        ...whereBranch,
        currentQty: { gt: 0 },
      },
    });

    const currentStockValue = batches.reduce(
      (sum, b) => sum + b.currentQty * b.purchasePrice,
      0
    );

    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiredCount = batches.filter((b) => b.expiryDate < new Date()).length;
    const expiringCount = batches.filter(
      (b) => b.expiryDate >= new Date() && b.expiryDate <= in30Days
    ).length;

    // 4. Low stock & Out of stock counts
    const medicines = await this.prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        batches: {
          where: { ...whereBranch, currentQty: { gt: 0 } },
        },
      },
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const m of medicines) {
      const stock = m.batches.reduce((sum, b) => sum + b.currentQty, 0);
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= m.reorderLevel) {
        lowStockCount++;
      }
    }

    // 5. Pending supplier payments
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { currentBalance: true },
    });
    const pendingSupplierPayments = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

    // 6. 7-Day Sales Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentSales = await this.prisma.salesInvoice.findMany({
      where: {
        ...whereBranch,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const salesTrendMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0]!;
      salesTrendMap[key] = 0;
    }

    for (const sale of recentSales) {
      const key = sale.createdAt.toISOString().split('T')[0]!;
      if (salesTrendMap[key] !== undefined) {
        salesTrendMap[key] += sale.totalAmount;
      }
    }

    const salesTrend = Object.entries(salesTrendMap).map(([date, amount]) => ({
      date,
      amount,
    }));

    // 7. Top 5 Selling Medicines (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topItems = await this.prisma.salesItem.groupBy({
      by: ['medicineId'],
      _sum: { qty: true, lineTotal: true },
      where: {
        salesInvoice: {
          ...whereBranch,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    });

    const topMedicines = await Promise.all(
      topItems.map(async (item) => {
        const med = await this.prisma.medicine.findUnique({
          where: { id: item.medicineId },
          select: { name: true, sku: true },
        });
        return {
          id: item.medicineId,
          name: med?.name || 'Unknown',
          sku: med?.sku || '',
          totalQty: item._sum.qty || 0,
          totalRevenue: item._sum.lineTotal || 0,
        };
      })
    );

    return {
      todaySales: todaySalesTotal,
      todaySalesCount,
      todayPurchases: todayPurchasesTotal,
      todayGrossProfit,
      currentStockValue,
      lowStockCount,
      outOfStockCount,
      expiringStockCount: expiringCount,
      expiredStockCount: expiredCount,
      pendingSupplierPayments,
      salesTrend,
      topMedicines,
    };
  }
}
