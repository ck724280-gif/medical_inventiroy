import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface OpenShiftDto {
  branchId?: string;
  openingCash: number;
  shiftType?: string; // DAY, EVENING, NIGHT, GENERAL
  notes?: string;
}

export interface CloseShiftDto {
  closingCash: number;
  notes?: string;
}

export interface OpenRegisterDto {
  branchId?: string;
  openingFloat: number;
  notes?: string;
}

export interface CloseRegisterDto {
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

  // =========================================================================
  // 1. STORE CASH REGISTER SESSION (Branch Master Session)
  // =========================================================================

  /**
   * Get active Cash Register Session for a branch
   */
  async getCurrentRegister(userId: string, branchId?: string) {
    const resolvedBranchId = await this.resolveBranchId(userId, branchId);
    if (!resolvedBranchId) {
      return { isOpen: false, register: null };
    }

    const register = await this.prisma.cashRegisterSession.findFirst({
      where: {
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        openedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        shifts: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { openedAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!register) {
      return { isOpen: false, register: null };
    }

    const endTime = register.closedAt || new Date();

    // Query sales, payments, returns, and expenses during active register session
    const [salesBreakdown, paymentsBreakdown, returnsBreakdown, expensesBreakdown] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          branchId: register.branchId,
          createdAt: { gte: register.openedAt, lte: endTime },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.salesPayment.findMany({
        where: {
          salesInvoice: {
            branchId: register.branchId,
            createdAt: { gte: register.openedAt, lte: endTime },
            status: { not: 'CANCELLED' },
          },
        },
      }),
      this.prisma.salesReturn.findMany({
        where: {
          branchId: register.branchId,
          createdAt: { gte: register.openedAt, lte: endTime },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          branchId: register.branchId,
          date: { gte: register.openedAt, lte: endTime },
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
    const totalExpenses = expensesBreakdown.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashExpenses = expensesBreakdown
      .filter((e) => (e.paymentMethod || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalReturns = returnsBreakdown.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    const cashRefunds = returnsBreakdown
      .filter((r) => (r.refundMode || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const expectedDrawerCash = Math.max(0, register.openingFloat + liveCashSales - cashExpenses - cashRefunds);

    return {
      isOpen: true,
      register: {
        ...register,
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
      },
    };
  }

  /**
   * Open Store Cash Register Session for the branch
   */
  async openRegister(dto: OpenRegisterDto, userId: string) {
    const resolvedBranchId = await this.resolveBranchId(userId, dto.branchId);
    if (!resolvedBranchId) {
      throw new BadRequestException('No active branch found. Please select or configure a branch first.');
    }

    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: {
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
    });

    if (existing) {
      return this.getCurrentRegister(userId, resolvedBranchId);
    }

    const created = await this.prisma.cashRegisterSession.create({
      data: {
        branchId: resolvedBranchId,
        openedByUserId: userId,
        openingFloat: Number(dto.openingFloat) || 0,
        notes: dto.notes || null,
        status: 'OPEN',
        openedAt: new Date(),
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'register_open',
        entity: 'CashRegisterSession',
        entityId: created.id,
        newValue: JSON.stringify({ openingFloat: dto.openingFloat, branchId: resolvedBranchId }),
      },
    });

    return this.getCurrentRegister(userId, created.branchId);
  }

  /**
   * Close Store Cash Register Session and automatically close all open shifts under it
   */
  async closeRegister(registerId: string, dto: CloseRegisterDto, userId: string) {
    const register = await this.prisma.cashRegisterSession.findUnique({
      where: { id: registerId },
      include: {
        shifts: {
          where: { status: 'OPEN' },
        },
      },
    });

    if (!register) {
      throw new NotFoundException(`Cash Register Session #${registerId} not found.`);
    }

    if (register.status === 'CLOSED') {
      throw new BadRequestException('This cash register session is already closed.');
    }

    const currentSummary = await this.getCurrentRegister(userId, register.branchId);
    const expectedCash = currentSummary.register?.liveTotals?.expectedDrawerCash ?? register.openingFloat;
    const cashDifference = dto.closingCash - expectedCash;

    // 1. Close the Cash Register Session
    const closed = await this.prisma.cashRegisterSession.update({
      where: { id: registerId },
      data: {
        status: 'CLOSED',
        closingCash: dto.closingCash,
        expectedCash,
        cashDifference,
        closedByUserId: userId,
        closedAt: new Date(),
        notes: dto.notes || register.notes,
      },
      include: {
        branch: true,
        openedByUser: true,
        closedByUser: true,
      },
    });

    // 2. Auto-close any open staff shifts under this register session
    await this.prisma.cashierShift.updateMany({
      where: {
        branchId: register.branchId,
        status: 'OPEN',
      },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        notes: 'Auto-closed due to Cash Register Session end of day closure.',
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'register_close',
        entity: 'CashRegisterSession',
        entityId: registerId,
        newValue: JSON.stringify({ closingCash: dto.closingCash, cashDifference }),
      },
    });

    return closed;
  }

  // =========================================================================
  // 2. STAFF CASHIER SHIFTS (Day / Evening / Night Shifts)
  // =========================================================================

  /**
   * Get currently active open shift for a staff member
   */
  async getCurrentShift(userId: string, branchId?: string) {
    const resolvedBranchId = await this.resolveBranchId(userId, branchId);
    if (!resolvedBranchId) return null;

    // RULE 1: If Cash Register is NOT open, no shift can be active!
    const activeRegister = await this.prisma.cashRegisterSession.findFirst({
      where: {
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
    });

    if (!activeRegister) {
      // Auto-reconcile any stray open shifts
      await this.prisma.cashierShift.updateMany({
        where: {
          branchId: resolvedBranchId,
          status: 'OPEN',
        },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          notes: 'Auto-closed because store cash register is closed.',
        },
      });
      return null;
    }

    const shift = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        registerSession: { select: { id: true, status: true, openingFloat: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) return null;

    const endTime = shift.closedAt || new Date();

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
        include: { payments: true },
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
          createdByUserId: shift.userId,
          createdAt: { gte: shift.openedAt, lte: endTime },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          branchId: shift.branchId,
          createdByUserId: shift.userId,
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
    const totalExpenses = expensesBreakdown.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashExpenses = expensesBreakdown
      .filter((e) => (e.paymentMethod || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const totalReturns = returnsBreakdown.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    const cashRefunds = returnsBreakdown
      .filter((r) => (r.refundMode || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const expectedDrawerCash = Math.max(0, shift.openingCash + liveCashSales - cashExpenses - cashRefunds);

    return {
      ...shift,
      shiftId: shift.id,
      registerSessionId: activeRegister.id,
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
   * Open staff shift session (Day / Evening / Night)
   */
  async openShift(dto: OpenShiftDto, userId: string) {
    const resolvedBranchId = await this.resolveBranchId(userId, dto.branchId);
    if (!resolvedBranchId) {
      throw new BadRequestException('No active branch found. Please select or configure a branch first.');
    }

    // RULE 1: Store Cash Register MUST be open first!
    const activeRegister = await this.prisma.cashRegisterSession.findFirst({
      where: {
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
    });

    if (!activeRegister) {
      throw new BadRequestException(
        'Store Cash Register is currently CLOSED. Please open the Cash Register before starting a staff shift.'
      );
    }

    // Check if staff already has an open shift in this branch
    const existing = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        branchId: resolvedBranchId,
        status: 'OPEN',
      },
    });

    if (existing) {
      return this.getCurrentShift(userId, resolvedBranchId);
    }

    const shiftType = (dto.shiftType || 'DAY').toUpperCase();

    const created = await this.prisma.cashierShift.create({
      data: {
        branchId: resolvedBranchId,
        userId,
        registerSessionId: activeRegister.id,
        shiftType,
        openingCash: Number(dto.openingCash) || 0,
        notes: dto.notes || null,
        status: 'OPEN',
        openedAt: new Date(),
      },
    });

    return this.getCurrentShift(userId, created.branchId);
  }

  /**
   * Close specific cashier staff shift.
   * RULE 2: Keeps parent CashRegisterSession OPEN for next shifts!
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
      throw new BadRequestException('This shift session is already closed.');
    }

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
          createdByUserId: shift.userId,
          date: { gte: shift.openedAt, lte: new Date() },
          paymentMethod: 'CASH',
        },
      }),
      this.prisma.salesReturn.findMany({
        where: {
          branchId: shift.branchId,
          createdByUserId: shift.userId,
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

    // Update ONLY the CashierShift to CLOSED. The parent CashRegisterSession stays OPEN!
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
        registerSession: true,
      },
    });
  }

  /**
   * Get shift report / Z-Report
   */
  async getShiftReport(shiftId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        branch: true,
        user: true,
        registerSession: true,
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
      reportType: shift.status === 'CLOSED' ? 'SHIFT HANDOVER & CLOSURE REPORT' : 'X-REPORT (Mid-Shift Audit)',
      shiftId: shift.id,
      shiftType: shift.shiftType,
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

  /**
   * Get all shifts history for a branch
   */
  async getBranchShifts(branchId?: string, registerSessionId?: string) {
    return this.prisma.cashierShift.findMany({
      where: {
        ...(branchId && branchId !== 'all' ? { branchId } : {}),
        ...(registerSessionId ? { registerSessionId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        registerSession: { select: { id: true, status: true, openedAt: true, closedAt: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }
}
