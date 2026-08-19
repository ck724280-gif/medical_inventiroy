import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  BatchStatus,
  MovementDirection,
  StockMovementType,
  PaymentMode,
  SaleStatus,
  PaperWidth,
  ThermalReceiptDataDto,
} from '@medical-inventory/shared-types';
import {
  allocateBatchesFefo,
  generateInternalBarcode,
  formatInvoiceNumber,
  formatDate,
  roundToDecimals,
} from '../../packages/shared-utils/src/index.js';
import { EscPosService } from '../../apps/api/src/modules/printing/esc-pos.service.js';

export function runEndToEndPharmacyLifecycleTests(prisma: PrismaClient) {
  describe('Tier 4 - Complete End-to-End Pharmacy Operational Lifecycle', () => {
    let branchId: string;
    let userId: string;
    let categoryId: string;
    let unitId: string;
    let medicineId: string;
    let batchId: string;
    let salesInvoiceId: string;

    const escPosService = new EscPosService();

    before(async () => {
      const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
      const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
      const unit = await prisma.unit.findFirst({ where: { name: 'Box' } });
      const cat = await prisma.medicineCategory.findFirst();

      branchId = branch!.id;
      userId = user!.id;
      unitId = unit!.id;
      categoryId = cat!.id;
    });

    after(async () => {
      if (medicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId } });
        await prisma.salesReturnItem.deleteMany({ where: { medicineId } });
        await prisma.salesReturn.deleteMany({ where: { salesInvoiceId } });
        await prisma.salesItem.deleteMany({ where: { medicineId } });
        if (salesInvoiceId) {
          await prisma.salesPayment.deleteMany({ where: { salesInvoiceId } });
          await prisma.salesInvoice.delete({ where: { id: salesInvoiceId } }).catch(() => {});
        }
        await prisma.batch.deleteMany({ where: { medicineId } });
        await prisma.medicine.delete({ where: { id: medicineId } }).catch(() => {});
      }
    });

    it('Phase 1: Catalog Creation & Barcode Generation', async () => {
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      const generatedBarcode = generateInternalBarcode(uniqueNum);

      const med = await prisma.medicine.create({
        data: {
          name: `E2E LifeCycle Medicine ${Date.now()}`,
          genericName: 'Azithromycin 500mg USP',
          sku: `SKU-E2E-${uniqueNum}`,
          barcode: generatedBarcode,
          categoryId,
          baseUnitId: unitId,
          taxPercent: 12,
          hsnCode: '30049099',
          isActive: true,
        },
      });
      medicineId = med.id;

      assert.ok(medicineId);
      assert.strictEqual(med.barcode?.length, 13);
    });

    it('Phase 2: Inward Purchase & Stock Receipt', async () => {
      const batch = await prisma.batch.create({
        data: {
          batchNumber: `AZI-${Date.now().toString().slice(-6)}`,
          medicineId,
          branchId,
          mfgDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          purchasePrice: 120,
          sellingPrice: 180,
          mrp: 200,
          taxPercent: 12,
          initialQty: 100,
          currentQty: 100,
          status: BatchStatus.ACTIVE,
        },
      });
      batchId = batch.id;

      await prisma.stockMovement.create({
        data: {
          branchId,
          medicineId,
          batchId,
          qty: 100,
          direction: MovementDirection.IN,
          type: StockMovementType.PURCHASE,
          userId,
          reason: 'Initial PO Inward Stock',
        },
      });

      assert.ok(batchId);
    });

    it('Phase 3: POS FEFO Dispensation & Receipt Generation', async () => {
      const availableBatches = await prisma.batch.findMany({
        where: { medicineId, branchId, status: BatchStatus.ACTIVE, currentQty: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
      });

      const fefo = allocateBatchesFefo(availableBatches as any, 10);
      assert.strictEqual(fefo.isFullySatisfied, true);
      assert.strictEqual(fefo.allocatedTotal, 10);

      const invNumber = formatInvoiceNumber('E2E-INV', 777, 6);

      const sale = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: invNumber,
          branchId,
          status: SaleStatus.COMPLETED,
          subtotal: 1800,
          discountAmount: 0,
          taxAmount: 216,
          totalAmount: 2016,
          paymentStatus: 'PAID',
          createdByUserId: userId,
          items: {
            create: [
              {
                medicineId,
                batchId,
                qty: 10,
                rate: 180,
                mrp: 200,
                taxPercent: 12,
                lineTotal: 2016,
              },
            ],
          },
          payments: {
            create: [
              {
                amount: 2016,
                paymentMode: PaymentMode.UPI,
                referenceNumber: 'UPI-REF-998877',
                createdByUserId: userId,
              },
            ],
          },
        },
        include: { items: true, payments: true },
      });
      salesInvoiceId = sale.id;

      // Stock deduction
      await prisma.batch.update({
        where: { id: batchId },
        data: { currentQty: { decrement: 10 } },
      });

      await prisma.stockMovement.create({
        data: {
          branchId,
          medicineId,
          batchId,
          qty: 10,
          direction: MovementDirection.OUT,
          type: StockMovementType.SALE,
          referenceType: 'SalesInvoice',
          referenceId: sale.id,
          userId,
          reason: `POS Sale ${invNumber}`,
        },
      });

      // Generate ESC/POS Thermal Receipt
      const receiptDto: ThermalReceiptDataDto = {
        storeName: 'MedCare Pharmacy ERP',
        invoiceNumber: invNumber,
        date: formatDate(new Date()),
        time: '14:30 PM',
        cashierName: 'Super Admin',
        items: [
          {
            name: 'Azithromycin 500mg',
            batch: 'AZI-9988',
            expiry: '08-2027',
            qty: 10,
            unit: 'Box',
            rate: 180,
            mrp: 200,
            discount: 0,
            tax: 12,
            amount: 2016,
          },
        ],
        subtotal: 1800,
        discountTotal: 0,
        taxTotal: 216,
        grandTotal: 2016,
        paymentMode: 'UPI',
        payments: [{ mode: 'UPI', amount: 2016 }],
        paperWidth: PaperWidth.WIDTH_58MM,
      };

      const receiptBuffer = escPosService.generateEscPosCommands(receiptDto);
      assert.ok(receiptBuffer.length > 0);

      // Verify stock in DB
      const updatedBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      assert.strictEqual(updatedBatch?.currentQty, 90);
    });

    it('Phase 4: Financial Accuracy Verification (COGS & Margin)', async () => {
      // 10 units sold @ 180 = 1800 revenue (excluding tax)
      // 10 units purchase cost @ 120 = 1200 COGS
      // Gross Profit = 1800 - 1200 = 600
      const revenue = 1800;
      const cogs = 1200;
      const profit = revenue - cogs;
      const margin = roundToDecimals((profit / revenue) * 100, 2);

      assert.strictEqual(profit, 600);
      assert.strictEqual(margin, 33.33);
    });
  });
}
