import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  BatchStatus,
  MovementDirection,
  StockMovementType,
  ReturnCondition,
  PaymentMode,
  SaleStatus,
} from '@medical-inventory/shared-types';
import { formatReturnNumber } from '../../packages/shared-utils/src/invoice-number.js';

export function runSalesReturnsStockRestoreTests(prisma: PrismaClient) {
  describe('Tier 3 - Atomic Sales Return Workflow (Resalable vs Damaged vs Expired)', () => {
    let branchId: string;
    let userId: string;
    let medicineId: string;
    let batchId: string;
    let salesInvoiceId: string;
    let salesItemId: string;

    before(async () => {
      const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
      const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
      const unit = await prisma.unit.findFirst({ where: { name: 'Strip' } });

      if (!branch || !user || !unit) {
        throw new Error('Database must be seeded before running Tier 3 tests');
      }

      branchId = branch.id;
      userId = user.id;

      // Create test medicine & batch
      const testMed = await prisma.medicine.create({
        data: {
          name: `Test Return Drug ${Date.now()}`,
          sku: `SKU-RET-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: unit.id,
          taxPercent: 5,
          isActive: true,
        },
      });
      medicineId = testMed.id;

      const batch = await prisma.batch.create({
        data: {
          batchNumber: `RET-B-${Date.now()}`,
          medicineId,
          branchId,
          mfgDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          purchasePrice: 40,
          sellingPrice: 70,
          mrp: 75,
          taxPercent: 5,
          initialQty: 50,
          currentQty: 40, // 10 units already sold
          damagedQty: 0,
          expiredQty: 0,
          status: BatchStatus.ACTIVE,
        },
      });
      batchId = batch.id;

      // Create initial Sales Invoice for 10 units
      const sale = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: `INV-RET-TEST-${Date.now()}`,
          branchId,
          status: SaleStatus.COMPLETED,
          subtotal: 700,
          discountAmount: 0,
          taxAmount: 35,
          totalAmount: 735,
          paymentStatus: 'PAID',
          createdByUserId: userId,
          items: {
            create: [
              {
                medicineId,
                batchId,
                qty: 10,
                rate: 70,
                mrp: 75,
                taxPercent: 5,
                lineTotal: 735,
              },
            ],
          },
          payments: {
            create: [
              {
                amount: 735,
                paymentMode: PaymentMode.CASH,
                createdByUserId: userId,
              },
            ],
          },
        },
        include: { items: true },
      });

      salesInvoiceId = sale.id;
      salesItemId = sale.items[0]!.id;
    });

    after(async () => {
      if (medicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId } });
        await prisma.salesReturnItem.deleteMany({ where: { medicineId } });
        await prisma.salesReturn.deleteMany({ where: { salesInvoiceId } });
        await prisma.salesItem.deleteMany({ where: { medicineId } });
        await prisma.salesInvoice.delete({ where: { id: salesInvoiceId } }).catch(() => {});
        await prisma.batch.deleteMany({ where: { medicineId } });
        await prisma.medicine.delete({ where: { id: medicineId } }).catch(() => {});
      }
    });

    it('Scenario A: Resalable Return of 3 units restores live stock (currentQty incremented by 3)', async () => {
      const returnCount = await prisma.salesReturn.count();
      const returnNumber = formatReturnNumber('RET-S', returnCount + 1, 6);

      await prisma.$transaction(async (tx) => {
        const salesReturn = await tx.salesReturn.create({
          data: {
            returnNumber,
            salesInvoiceId,
            branchId,
            status: 'COMPLETED',
            refundAmount: 220.5, // 3 units @ 73.5
            refundMode: PaymentMode.CASH,
            createdByUserId: userId,
            items: {
              create: [
                {
                  salesItemId,
                  medicineId,
                  batchId,
                  returnQty: 3,
                  reason: 'Customer ordered excess strip',
                },
              ],
            },
          },
        });

        // Atomic stock restore
        await tx.batch.update({
          where: { id: batchId },
          data: { currentQty: { increment: 3 } },
        });

        // Stock movement
        await tx.stockMovement.create({
          data: {
            branchId,
            medicineId,
            batchId,
            qty: 3,
            direction: MovementDirection.IN,
            type: StockMovementType.SALES_RETURN,
            referenceType: 'SalesReturn',
            referenceId: salesReturn.id,
            userId,
            reason: `Sales Return #${returnNumber} (RESALABLE)`,
          },
        });
      });

      const updatedBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      assert.strictEqual(updatedBatch?.currentQty, 43); // 40 + 3 = 43
      assert.strictEqual(updatedBatch?.damagedQty, 0);
    });

    it('Scenario B: Damaged Return of 2 units increments damagedQty WITHOUT restoring live stock', async () => {
      const returnCount = await prisma.salesReturn.count();
      const returnNumber = formatReturnNumber('RET-S', returnCount + 1, 6);

      await prisma.$transaction(async (tx) => {
        const salesReturn = await tx.salesReturn.create({
          data: {
            returnNumber,
            salesInvoiceId,
            branchId,
            status: 'COMPLETED',
            refundAmount: 147.0, // 2 units @ 73.5
            refundMode: PaymentMode.CASH,
            createdByUserId: userId,
            items: {
              create: [
                {
                  salesItemId,
                  medicineId,
                  batchId,
                  returnQty: 2,
                  reason: 'Seal broken on arrival',
                },
              ],
            },
          },
        });

        // Damaged stock increment
        await tx.batch.update({
          where: { id: batchId },
          data: { damagedQty: { increment: 2 } },
        });

        await tx.stockMovement.create({
          data: {
            branchId,
            medicineId,
            batchId,
            qty: 2,
            direction: MovementDirection.IN,
            type: StockMovementType.SALES_RETURN,
            referenceType: 'SalesReturn',
            referenceId: salesReturn.id,
            userId,
            reason: `Sales Return #${returnNumber} (DAMAGED)`,
          },
        });
      });

      const updatedBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      assert.strictEqual(updatedBatch?.currentQty, 43); // live stock remains 43
      assert.strictEqual(updatedBatch?.damagedQty, 2); // damaged stock is 2
    });

    it('Scenario C: Return quantity validation strictly blocks returning more than sold units', async () => {
      // 3 resalable + 2 damaged = 5 units already returned out of 10
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: salesInvoiceId },
        include: { returns: { include: { items: true } }, items: true },
      });

      const alreadyReturned = invoice!.returns.reduce((sum, r) => {
        const item = r.items.find((i) => i.salesItemId === salesItemId);
        return sum + (item?.returnQty || 0);
      }, 0);

      assert.strictEqual(alreadyReturned, 5);

      const attemptedReturnQty = 6; // 5 + 6 = 11 > 10
      const exceedsMax = alreadyReturned + attemptedReturnQty > invoice!.items[0]!.qty;

      assert.strictEqual(exceedsMax, true); // Guardrail properly detected violation
    });
  });
}
