import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface OpenShiftDto {
  branchId: string;
  openingCash: number;
  notes?: string;
}

export interface CloseShiftDto {
  closingCash: number;
  notes?: string;
}

@Injectable()
export class CashRegistersService {
  constructor(private prisma: PrismaService) {}

  private async resolveBranchId(userId: string, branchId?: string): Promise<string> {
    if (branchId && branchId !== 'all' && branchId !== 'ALL') {
      const branch = await this.prisma.branch.findFirst({
        where: {
          OR: [{ id: branchId }, { code: branchId }],
        },
        select: { id: true },
      });
      if (branch?.id) return branch.id;
    }

    const userWithBranches = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branches: true },
    });
    if (userWithBranches?.branches?.[0]?.id) {
      return userWithBranches.branches[0].id;
    }
    const fallback = await this.prisma.branch.findFirst({ select: { id: true } });
    return fallback?.id || '';
  }

  /**
   * Get currently active open shift for a user or branch
   */
  async getCurrentShift(userId: string, branchId?: string) {
    const resolvedBranchId = branchId && branchId !== 'all' ? await this.resolveBranchId(userId, branchId) : undefined;

    // First try finding an open shift for this user and branch
    let shift = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        status: 'OPEN',
        ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    // Fallback: If no shift matched the specific branch filter, find ANY open shift for this user
    if (!shift) {
      shift = await this.prisma.cashierShift.findFirst({
        where: {
          userId,
          status: 'OPEN',
        },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: 'desc' },
      });
    }

    if (!shift) return null;

    const endTime = shift.closedAt || new Date();

    // Query sales, payments, returns, and expenses during active shift
    const [salesBreakdown, paymentsBreakdown, returnsBreakdown, expensesBreakdown] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          branchId: shift.branchId,
          OR: [
            { shiftId: shift.id },
            {
              createdByUserId: shift.userId,
              createdAt: { gte: shift.openedAt, lte: endTime },
            },
          ],
          status: { not: 'CANCELLED' },
        },
        include: {
          payments: true,
        },
      }),
      this.prisma.salesPayment.findMany({
        where: {
          salesInvoice: {
            branchId: shift.branchId,
            OR: [
              { shiftId: shift.id },
              {
                createdByUserId: shift.userId,
                createdAt: { gte: shift.openedAt, lte: endTime },
              },
            ],
            status: { not: 'CANCELLED' },
          },
        },
      }),
      this.prisma.salesReturn.findMany({
        where: {
          branchId: shift.branchId,
          createdAt: { gte: shift.openedAt, lte: endTime },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          branchId: shift.branchId,
          date: { gte: shift.openedAt, lte: endTime },
        },
      }),
    ]);

    let liveCashSales = 0;
    let liveUpiSales = 0;
    let liveCardSales = 0;
    let liveCreditSales = 0;

    for (const p of paymentsBreakdown) {
      if (p.paymentMode === 'CASH') liveCashSales += p.amount;
      else if (p.paymentMode === 'UPI') liveUpiSales += p.amount;
      else if (p.paymentMode === 'CARD') liveCardSales += p.amount;
      else if (p.paymentMode === 'CREDIT') liveCreditSales += p.amount;
    }

    const liveTotalSales = liveCashSales + liveUpiSales + liveCardSales + liveCreditSales;

    // Expenses during shift
    const totalExpenses = expensesBreakdown.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashExpenses = expensesBreakdown
      .filter((e) => (e.paymentMethod || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Sales Returns / Refunds during shift
    const totalReturns = returnsBreakdown.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    const cashRefunds = returnsBreakdown
      .filter((r) => (r.refundMode || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const expectedDrawerCash = Math.max(0, shift.openingCash + liveCashSales - cashExpenses - cashRefunds);

    return {
      ...shift,
      shiftId: shift.id,
      liveTotals: {
        totalSalesCount: salesBreakdown.length,
        totalSalesAmount: liveTotalSales,
        cashSales: liveCashSales,
        upiSales: liveUpiSales,
        cardSales: liveCardSales,
        creditSales: liveCreditSales,
        totalExpenses,
        cashExpenses,
        totalReturns,
        cashRefunds,
        expectedDrawerCash,
      },
    };
  }

  /**
   * Open a new cashier shift session
   */
  async openShift(dto: OpenShiftDto, userId: string) {
    const resolvedBranchId = await this.resolveBranchId(userId, dto.branchId);
    if (!resolvedBranchId) {
      throw new BadRequestException('No active branch found. Please select or configure a branch first.');
    }

    // Check if user already has an active open shift
    const existing = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
      include: {
        branch: true,
        user: true,
      },
    });

    if (existing) {
      return this.getCurrentShift(userId, existing.branchId);
    }

    const created = await this.prisma.cashierShift.create({
      data: {
        branchId: resolvedBranchId,
        userId,
        openingCash: Number(dto.openingCash) || 0,
        notes: dto.notes || null,
        status: 'OPEN',
        openedAt: new Date(),
      },
      include: {
        branch: true,
        user: true,
      },
    });

    return this.getCurrentShift(userId, created.branchId);
  }

  /**
   * Close cashier register shift and calculate discrepancy variance
   */
  async closeShift(shiftId: string, dto: CloseShiftDto, userId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          include: { payments: true },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift #${shiftId} not found.`);
    }

    if (shift.status === 'CLOSED') {
      throw new BadRequestException('This shift register session is already closed.');
    }

    // Compute final audit breakdown
    let totalCashSales = 0;
    let totalUpiSales = 0;
    let totalCardSales = 0;
    let totalCreditSales = 0;

    for (const sale of shift.sales) {
      for (const p of sale.payments) {
        if (p.paymentMode === 'CASH') totalCashSales += p.amount;
        else if (p.paymentMode === 'UPI') totalUpiSales += p.amount;
        else if (p.paymentMode === 'CARD') totalCardSales += p.amount;
        else if (p.paymentMode === 'CREDIT') totalCreditSales += p.amount;
      }
    }

    const [expenses, returns] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          branchId: shift.branchId,
          date: { gte: shift.openedAt, lte: new Date() },
          paymentMethod: 'CASH',
        },
      }),
      this.prisma.salesReturn.findMany({
        where: {
          branchId: shift.branchId,
          createdAt: { gte: shift.openedAt, lte: new Date() },
          refundMode: 'CASH',
        },
      }),
    ]);

    const cashExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashRefunds = returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const totalSalesAmount = totalCashSales + totalUpiSales + totalCardSales + totalCreditSales;
    const expectedCash = Math.max(0, shift.openingCash + totalCashSales - cashExpenses - cashRefunds);
    const cashDifference = dto.closingCash - expectedCash;

    return this.prisma.cashierShift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closingCash: dto.closingCash,
        expectedCash,
        cashDifference,
        totalSalesCount: shift.sales.length,
        totalSalesAmount,
        totalCashSales,
        totalUpiSales,
        totalCardSales,
        totalCreditSales,
        notes: dto.notes || shift.notes,
        closedAt: new Date(),
      },
      include: {
        branch: true,
        user: true,
      },
    });
  }

  /**
   * Generate X-Report / Z-Report shift audit
   */
  async getShiftReport(shiftId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        branch: true,
        user: true,
        sales: {
          include: {
            customer: true,
            payments: true,
          },
        },
      },
    });

    if (!shift) throw new NotFoundException(`Shift #${shiftId} not found.`);

    return {
      reportType: shift.status === 'CLOSED' ? 'Z-REPORT (End of Day Closure)' : 'X-REPORT (Mid-Shift Audit)',
      shiftId: shift.id,
      branch: shift.branch,
      cashier: `${shift.user.firstName} ${shift.user.lastName || ''}`.trim(),
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      openingFloat: shift.openingCash,
      closingCashCounted: shift.closingCash,
      expectedCashInDrawer: shift.expectedCash || shift.openingCash + shift.totalCashSales,
      variance: shift.cashDifference || 0,
      salesSummary: {
        totalCount: shift.totalSalesCount || shift.sales.length,
        totalAmount: shift.totalSalesAmount,
        cash: shift.totalCashSales,
        upi: shift.totalUpiSales,
        card: shift.totalCardSales,
        credit: shift.totalCreditSales,
      },
      transactions: shift.sales.map((s) => ({
        invoiceNumber: s.invoiceNumber,
        customerName: s.customer?.name || 'Walk-in',
        total: s.totalAmount,
        payments: s.payments.map((p) => `${p.paymentMode}: ₹${p.amount}`).join(', '),
      })),
    };
  }
}
