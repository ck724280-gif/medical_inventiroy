import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FefoService } from '../inventory/fefo.service';
import { SalesService } from '../sales/sales.service';
import {
  CheckoutSaleDto,
  OpenShiftDto,
  CloseShiftDto,
} from '../sales/dto/create-sale.dto';
import {
  BatchStatus,
  ShiftStatus,
  PaymentMode,
} from '@medical-inventory/shared-types';

export interface HeldCartRecord {
  id: string;
  code: string;
  name: string;
  customer?: any;
  items: any[];
  payments?: any[];
  invoiceDiscountPercent?: number;
  notes?: string;
  totalAmount: number;
  itemCount: number;
  timestamp: Date;
  branchId: string;
  userId: string;
}

// In-memory store for held carts with branch-level isolation
const heldCartsStore = new Map<string, HeldCartRecord>();
let heldCounter = 1;

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private fefoService: FefoService,
    private salesService: SalesService
  ) {}

  /**
   * Smart Product Search across Name, Generic, Brand, SKU, Barcode, Manufacturer
   */
  async search(query: string, branchId: string) {
    const q = (query || '').trim();
    if (!q) return [];

    const now = new Date();

    const medicines = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { manufacturer: { name: { contains: q, mode: 'insensitive' } } },
          { barcodes: { some: { barcodeValue: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      take: 25,
      include: {
        baseUnit: true,
        category: true,
        manufacturer: { select: { id: true, name: true } },
        batches: {
          where: {
            branchId,
            status: BatchStatus.ACTIVE,
            expiryDate: { gt: now },
            currentQty: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' }, // FEFO ordering
        },
      },
    });

    return medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.currentQty, 0);
      const fefoBatch = med.batches[0] || null;

      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        brandName: med.brandName,
        composition: med.composition,
        dosageForm: med.dosageForm,
        sku: med.sku,
        barcode: med.barcode,
        hsnCode: med.hsnCode,
        mrp: med.mrp,
        defaultSellingPrice: med.defaultSellingPrice,
        taxPercent: med.taxPercent,
        baseUnit: med.baseUnit?.abbreviation || 'PCS',
        prescriptionRequired: Boolean(
          med.prescriptionRequired ||
          med.isScheduleH ||
          med.isScheduleH1 ||
          med.isScheduleX ||
          med.drugSchedule !== 'OTC'
        ),
        drugSchedule: med.drugSchedule,
        isScheduleH: med.isScheduleH,
        isScheduleH1: med.isScheduleH1,
        isScheduleX: med.isScheduleX,
        manufacturer: med.manufacturer?.name || 'Unknown',
        availableStock: totalStock,
        fefoBatch: fefoBatch
          ? {
              id: fefoBatch.id,
              batchNumber: fefoBatch.batchNumber,
              expiryDate: fefoBatch.expiryDate,
              mrp: fefoBatch.mrp,
              sellingPrice: fefoBatch.sellingPrice,
              currentQty: fefoBatch.currentQty,
              taxPercent: fefoBatch.taxPercent,
            }
          : null,
        batches: med.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          mrp: b.mrp,
          sellingPrice: b.sellingPrice,
          currentQty: b.currentQty,
          taxPercent: b.taxPercent,
        })),
      };
    });
  }

  /**
   * Fast Barcode Scan with FEFO resolution
   */
  async quickScan(barcode: string, branchId: string) {
    const code = (barcode || '').trim();
    if (!code) {
      throw new BadRequestException('Barcode cannot be empty');
    }

    const now = new Date();

    const medicine = await this.prisma.medicine.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: code },
          { sku: code },
          { eanUpcGtin: code },
          { barcodes: { some: { barcodeValue: code } } },
        ],
      },
      include: {
        baseUnit: true,
        category: true,
        manufacturer: { select: { id: true, name: true } },
        batches: {
          where: {
            branchId,
            status: BatchStatus.ACTIVE,
            expiryDate: { gt: now },
            currentQty: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' }, // FEFO sort
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException(`No active medicine found with barcode/SKU '${code}'`);
    }

    const availableStock = medicine.batches.reduce((sum, b) => sum + b.currentQty, 0);
    const fefoBatch = medicine.batches[0] || null;

    return {
      medicine: {
        id: medicine.id,
        name: medicine.name,
        genericName: medicine.genericName,
        brandName: medicine.brandName,
        sku: medicine.sku,
        barcode: medicine.barcode,
        hsnCode: medicine.hsnCode,
        mrp: fefoBatch?.mrp ?? medicine.mrp,
        defaultSellingPrice: fefoBatch?.sellingPrice ?? medicine.defaultSellingPrice,
        taxPercent: fefoBatch?.taxPercent ?? medicine.taxPercent,
        baseUnit: medicine.baseUnit?.abbreviation || 'PCS',
        prescriptionRequired: Boolean(
          medicine.prescriptionRequired ||
          medicine.isScheduleH ||
          medicine.isScheduleH1 ||
          medicine.isScheduleX ||
          medicine.drugSchedule !== 'OTC'
        ),
        drugSchedule: medicine.drugSchedule,
        manufacturer: medicine.manufacturer?.name || 'Unknown',
      },
      fefoBatch: fefoBatch
        ? {
            id: fefoBatch.id,
            batchNumber: fefoBatch.batchNumber,
            expiryDate: fefoBatch.expiryDate,
            mrp: fefoBatch.mrp,
            sellingPrice: fefoBatch.sellingPrice,
            currentQty: fefoBatch.currentQty,
            taxPercent: fefoBatch.taxPercent,
          }
        : null,
      availableStock,
      batches: medicine.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        mfgDate: b.mfgDate,
        expiryDate: b.expiryDate,
        mrp: b.mrp,
        sellingPrice: b.sellingPrice,
        currentQty: b.currentQty,
        taxPercent: b.taxPercent,
      })),
    };
  }

  /**
   * Get all active, non-expired batches for a medicine
   */
  async getBatchesForMedicine(medicineId: string, branchId: string) {
    const now = new Date();
    const batches = await this.prisma.batch.findMany({
      where: {
        medicineId,
        branchId,
        status: BatchStatus.ACTIVE,
        expiryDate: { gt: now },
        currentQty: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      mfgDate: b.mfgDate,
      expiryDate: b.expiryDate,
      mrp: b.mrp,
      sellingPrice: b.sellingPrice,
      currentQty: b.currentQty,
      taxPercent: b.taxPercent,
    }));
  }

  /**
   * Retrieve last completed bill for instant reprint / preview
   */
  async getLastBill(branchId: string, userId?: string) {
    const where: any = { branchId };
    if (userId) where.createdByUserId = userId;

    const lastSale = await this.prisma.salesInvoice.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true },
    });

    if (!lastSale) {
      throw new NotFoundException('No previous invoice found for this branch');
    }

    const receipt = await this.salesService.getReceiptData(lastSale.id);
    return {
      invoiceId: lastSale.id,
      invoiceNumber: lastSale.invoiceNumber,
      totalAmount: lastSale.totalAmount,
      createdAt: lastSale.createdAt,
      receipt,
    };
  }

  // ============================================================
  // CASHIER SHIFT MANAGEMENT
  // ============================================================

  async getCurrentShift(userId: string, branchId: string) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        branchId,
        status: ShiftStatus.OPEN,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) return null;
    return this.getShiftSummary(shift.id, userId);
  }

  async openShift(dto: OpenShiftDto, userId: string) {
    const existingOpen = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        branchId: dto.branchId,
        status: ShiftStatus.OPEN,
      },
    });

    if (existingOpen) {
      return this.getShiftSummary(existingOpen.id, userId);
    }

    const shift = await this.prisma.cashierShift.create({
      data: {
        branchId: dto.branchId,
        userId,
        status: ShiftStatus.OPEN,
        openingCash: Number(dto.openingCash) || 0,
        notes: dto.notes || null,
        openedAt: new Date(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'shift_open',
        entity: 'CashierShift',
        entityId: shift.id,
        newValue: JSON.stringify({ openingCash: dto.openingCash, branchId: dto.branchId }),
      },
    });

    return this.getShiftSummary(shift.id, userId);
  }

  async getShiftSummary(shiftId: string, userId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Shift #${shiftId} not found`);
    }

    const endTime = shift.closedAt || new Date();

    // Query sales, payments, returns, expenses within shift timeframe
    const [salesInvoices, payments, returns, expenses] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          branchId: shift.branchId,
          createdByUserId: shift.userId,
          createdAt: { gte: shift.openedAt, lte: endTime },
          status: { not: 'CANCELLED' },
        },
        select: { id: true, totalAmount: true },
      }),
      this.prisma.salesPayment.findMany({
        where: {
          salesInvoice: {
            branchId: shift.branchId,
            createdByUserId: shift.userId,
            createdAt: { gte: shift.openedAt, lte: endTime },
          },
        },
        select: { amount: true, paymentMode: true },
      }),
      this.prisma.salesReturn.findMany({
        where: {
          branchId: shift.branchId,
          createdByUserId: shift.userId,
          createdAt: { gte: shift.openedAt, lte: endTime },
          status: 'COMPLETED',
        },
        select: { refundAmount: true, refundMode: true },
      }),
      this.prisma.expense.findMany({
        where: {
          branchId: shift.branchId,
          createdByUserId: shift.userId,
          createdAt: { gte: shift.openedAt, lte: endTime },
        },
        select: { amount: true, paymentMethod: true },
      }),
    ]);

    const totalSalesCount = salesInvoices.length;
    const totalSalesAmount = Number(
      salesInvoices.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)
    );

    let totalCashSales = 0;
    let totalUpiSales = 0;
    let totalCardSales = 0;
    let totalCreditSales = 0;

    for (const p of payments) {
      if (p.paymentMode === PaymentMode.CASH) totalCashSales += p.amount;
      else if (p.paymentMode === PaymentMode.UPI) totalUpiSales += p.amount;
      else if (p.paymentMode === PaymentMode.CARD) totalCardSales += p.amount;
      else if (p.paymentMode === PaymentMode.CREDIT) totalCreditSales += p.amount;
    }

    const totalReturnsAmount = Number(
      returns.reduce((sum, r) => sum + r.refundAmount, 0).toFixed(2)
    );
    const totalCashReturns = Number(
      returns
        .filter((r) => r.refundMode === PaymentMode.CASH)
        .reduce((sum, r) => sum + r.refundAmount, 0)
        .toFixed(2)
    );

    const totalExpensesAmount = Number(
      expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)
    );
    const totalCashExpenses = Number(
      expenses
        .filter((e) => e.paymentMethod === 'CASH')
        .reduce((sum, e) => sum + e.amount, 0)
        .toFixed(2)
    );

    const expectedCash = Number(
      (
        shift.openingCash +
        totalCashSales -
        totalCashReturns -
        totalCashExpenses
      ).toFixed(2)
    );

    const cashDifference =
      shift.closingCash !== null && shift.closingCash !== undefined
        ? Number((shift.closingCash - expectedCash).toFixed(2))
        : null;

    return {
      shiftId: shift.id,
      branchId: shift.branchId,
      branchName: shift.branch?.name,
      cashierName: `${shift.user.firstName} ${shift.user.lastName}`,
      status: shift.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingCash: shift.openingCash,
      totalSalesCount,
      totalSalesAmount,
      totalCashSales: Number(totalCashSales.toFixed(2)),
      totalUpiSales: Number(totalUpiSales.toFixed(2)),
      totalCardSales: Number(totalCardSales.toFixed(2)),
      totalCreditSales: Number(totalCreditSales.toFixed(2)),
      totalReturnsAmount,
      totalCashReturns,
      totalExpensesAmount,
      totalCashExpenses,
      expectedCash,
      closingCash: shift.closingCash,
      cashDifference,
      notes: shift.notes,
    };
  }

  async closeShift(dto: CloseShiftDto, userId: string) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Shift #${dto.shiftId} not found`);
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('This shift is already closed');
    }

    const summary = await this.getShiftSummary(shift.id, userId);
    const closingCash = Number(dto.closingCash) || 0;
    const cashDifference = Number((closingCash - summary.expectedCash).toFixed(2));

    const updated = await this.prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash,
        expectedCash: summary.expectedCash,
        cashDifference,
        totalSalesCount: summary.totalSalesCount,
        totalSalesAmount: summary.totalSalesAmount,
        totalCashSales: summary.totalCashSales,
        totalUpiSales: summary.totalUpiSales,
        totalCardSales: summary.totalCardSales,
        totalCreditSales: summary.totalCreditSales,
        totalReturnsAmount: summary.totalReturnsAmount,
        totalExpensesAmount: summary.totalExpensesAmount,
        closedAt: new Date(),
        notes: dto.notes || shift.notes,
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'shift_close',
        entity: 'CashierShift',
        entityId: shift.id,
        oldValue: JSON.stringify({ status: 'OPEN', expectedCash: summary.expectedCash }),
        newValue: JSON.stringify({
          status: 'CLOSED',
          closingCash,
          cashDifference,
        }),
      },
    });

    return this.getShiftSummary(updated.id, userId);
  }

  // ============================================================
  // HELD CARTS (HOLD & RESUME)
  // ============================================================

  async holdCart(data: {
    name?: string;
    customer?: any;
    cart: any;
    branchId: string;
    userId: string;
  }) {
    const code = `H${String(heldCounter++).padStart(3, '0')}`;
    const id = `HELD-${Date.now().toString(36).toUpperCase()}-${code}`;

    const items = data.cart?.items || [];
    const totalAmount = items.reduce(
      (sum: number, it: any) => sum + (Number(it.lineTotal) || Number(it.rate * it.qty) || 0),
      0
    );

    const record: HeldCartRecord = {
      id,
      code,
      name:
        data.name ||
        `${data.customer?.name || 'Walk-in'} (${items.length} items)`,
      customer: data.customer || null,
      items,
      payments: data.cart?.payments || [],
      invoiceDiscountPercent: data.cart?.invoiceDiscountPercent || 0,
      notes: data.cart?.notes || '',
      totalAmount: Number(totalAmount.toFixed(2)),
      itemCount: items.length,
      timestamp: new Date(),
      branchId: data.branchId,
      userId: data.userId,
    };

    heldCartsStore.set(id, record);
    return record;
  }

  async listHeldCarts(branchId?: string) {
    const list = Array.from(heldCartsStore.values());
    const filtered = branchId
      ? list.filter((c) => c.branchId === branchId)
      : list;

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async resumeCart(id: string) {
    const held = heldCartsStore.get(id);
    if (!held) {
      throw new NotFoundException(`Held cart '${id}' not found`);
    }
    heldCartsStore.delete(id);
    return held;
  }

  async deleteHeldCart(id: string) {
    if (heldCartsStore.has(id)) {
      heldCartsStore.delete(id);
    }
    return { success: true };
  }

  async checkout(dto: CheckoutSaleDto, userId: string) {
    return this.salesService.checkout(dto, userId);
  }
}
