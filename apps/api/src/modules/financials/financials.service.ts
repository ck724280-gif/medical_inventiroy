import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinancialsService {
  constructor(private prisma: PrismaService) {}

  async getFinancialSummary(query?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const whereBranch = query?.branchId ? { branchId: query.branchId } : {};
    const dateFilter: any = {};
    if (query?.startDate) dateFilter.gte = new Date(query.startDate);
    if (query?.endDate) dateFilter.lte = new Date(query.endDate);

    const hasDate = query?.startDate || query?.endDate;

    // 1. Sales & Cost of Goods Sold (COGS)
    const sales = await this.prisma.salesInvoice.findMany({
      where: {
        ...whereBranch,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
      include: {
        items: {
          include: {
            batch: { select: { purchasePrice: true } },
          },
        },
        payments: true,
      },
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalSalesTax = 0;
    let totalSalesDiscount = 0;
    const paymentModeBreakdown: Record<string, number> = {};

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
      totalSalesTax += sale.taxAmount;
      totalSalesDiscount += sale.discountAmount;

      for (const item of sale.items) {
        const costPerUnit = item.batch?.purchasePrice || 0;
        totalCogs += costPerUnit * item.qty;
      }

      for (const payment of sale.payments) {
        paymentModeBreakdown[payment.paymentMode] =
          (paymentModeBreakdown[payment.paymentMode] || 0) + payment.amount;
      }
    }

    const grossProfit = totalRevenue - totalCogs;

    // 2. Purchases
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        ...whereBranch,
        status: { in: ['CONFIRMED', 'APPROVED'] },
        ...(hasDate ? { createdAt: dateFilter } : {}),
      },
    });

    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPurchaseTax = purchases.reduce((sum, p) => sum + p.taxAmount, 0);

    // 3. Expenses
    const expenses = await this.prisma.expense.findMany({
      where: {
        ...whereBranch,
        ...(hasDate ? { date: dateFilter } : {}),
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCategoryBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      expenseCategoryBreakdown[exp.category] =
        (expenseCategoryBreakdown[exp.category] || 0) + exp.amount;
    }

    // 4. Net Profit Estimate
    const netProfitEstimate = grossProfit - totalExpenses;

    // 5. Payables & Receivables
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { currentBalance: true },
    });
    const totalSupplierPayable = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

    // Customer credit receivable
    const unpaidSales = await this.prisma.salesInvoice.findMany({
      where: {
        ...whereBranch,
        paymentStatus: 'UNPAID',
      },
      select: { totalAmount: true },
    });
    const totalCustomerReceivable = unpaidSales.reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      expenses: totalExpenses,
      netProfitEstimate,
      netProfitMargin: totalRevenue > 0 ? (netProfitEstimate / totalRevenue) * 100 : 0,
      totalPurchases,
      supplierPayable: totalSupplierPayable,
      customerReceivable: totalCustomerReceivable,
      taxSummary: {
        outputGstCollected: totalSalesTax,
        inputGstPaid: totalPurchaseTax,
        netTaxLiability: Math.max(0, totalSalesTax - totalPurchaseTax),
      },
      paymentModeBreakdown,
      expenseCategoryBreakdown,
    };
  }
}
