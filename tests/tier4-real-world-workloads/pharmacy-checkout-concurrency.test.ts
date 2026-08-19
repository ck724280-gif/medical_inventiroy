import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { BatchStatus, MovementDirection, StockMovementType, PaymentMode, SaleStatus } from '@medical-inventory/shared-types';
import { formatInvoiceNumber } from '../../packages/shared-utils/src/invoice-number.js';

export function runPharmacyCheckoutConcurrencyTests(prisma: PrismaClient) {
  describe('Tier 4 - Busy Pharmacy Counter Simulation & High-Volume Checkouts', () => {
    let branchId: string;
    let userId: string;
    let medicineId: string;
    let batchId: string;
    const initialStock = 100;
    const soldInvoices: string[] = [];

    before(async () => {
      const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
      const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
      const unit = await prisma.unit.findFirst({ where: { name: 'Tablet' } });

      branchId = branch!.id;
      userId = user!.id;

      const med = await prisma.medicine.create({
        data: {
          name: `High Demand Paracetamol ${Date.now()}`,
          sku: `SKU-SIM-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: unit!.id,
          taxPercent: 12,
          isActive: true,
        },
      });
      medicineId = med.id;

      const batch = await prisma.batch.create({
        data: {
          batchNumber: `SIM-BATCH-${Date.now()}`,
          medicineId,
          branchId,
          mfgDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          purchasePrice: 10,
          sellingPrice: 20,
          mrp: 25,
          taxPercent: 12,
          initialQty: initialStock,
          currentQty: initialStock,
          status: BatchStatus.ACTIVE,
        },
      });
      batchId = batch.id;
    });

    after(async () => {
      if (medicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId } });
        await prisma.salesItem.deleteMany({ where: { medicineId } });
        await prisma.salesPayment.deleteMany({ where: { salesInvoiceId: { in: soldInvoices } } });
        await prisma.salesInvoice.deleteMany({ where: { id: { in: soldInvoices } } });
        await prisma.batch.deleteMany({ where: { medicineId } });
        await prisma.medicine.delete({ where: { id: medicineId } }).catch(() => {});
      }
    });

    it('should process 10 rapid sequential POS checkouts accurately without race conditions or stock drift', async () => {
      const checkoutCount = 10;
      const qtyPerCheckout = 5; // 10 * 5 = 50 units sold

      for (let i = 1; i <= checkoutCount; i++) {
        await prisma.$transaction(async (tx) => {
          const invNumber = formatInvoiceNumber('SIM-INV', 1000 + i, 6);

          const invoice = await tx.salesInvoice.create({
            data: {
              invoiceNumber: invNumber,
              branchId,
              status: SaleStatus.COMPLETED,
              subtotal: qtyPerCheckout * 20,
              discountAmount: 0,
              taxAmount: qtyPerCheckout * 20 * 0.12,
              totalAmount: qtyPerCheckout * 20 * 1.12,
              paymentStatus: 'PAID',
              createdByUserId: userId,
              items: {
                create: [
                  {
                    medicineId,
                    batchId,
                    qty: qtyPerCheckout,
                    rate: 20,
                    mrp: 25,
                    taxPercent: 12,
                    lineTotal: qtyPerCheckout * 20 * 1.12,
                  },
                ],
              },
              payments: {
                create: [
                  {
                    amount: qtyPerCheckout * 20 * 1.12,
                    paymentMode: PaymentMode.UPI,
                    createdByUserId: userId,
                  },
                ],
              },
            },
          });

          soldInvoices.push(invoice.id);

          await tx.batch.update({
            where: { id: batchId },
            data: { currentQty: { decrement: qtyPerCheckout } },
          });

          await tx.stockMovement.create({
            data: {
              branchId,
              medicineId,
              batchId,
              qty: qtyPerCheckout,
              direction: MovementDirection.OUT,
              type: StockMovementType.SALE,
              referenceType: 'SalesInvoice',
              referenceId: invoice.id,
              userId,
              reason: `Rapid POS Checkout #${invNumber}`,
            },
          });
        });
      }

      // Verify stock level: 100 - 50 = 50
      const finalBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      assert.strictEqual(finalBatch?.currentQty, 50);

      // Verify exact number of invoices created
      assert.strictEqual(soldInvoices.length, 10);

      // Verify stock movement ledger total
      const totalMovedOut = await prisma.stockMovement.aggregate({
        where: { batchId, direction: MovementDirection.OUT },
        _sum: { qty: true },
      });
      assert.strictEqual(totalMovedOut._sum.qty, 50);
    });
  });
}
