import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { BatchStatus, MovementDirection, StockMovementType, PaymentMode, SaleStatus } from '@medical-inventory/shared-types';
import { allocateBatchesFefo } from '../../packages/shared-utils/src/fefo.js';
import { formatInvoiceNumber } from '../../packages/shared-utils/src/index.js';

export function runInwardToSalesFefoTests(prisma: PrismaClient) {
  describe('Tier 3 - Inward Purchase -> Batch Creation -> POS FEFO Checkout Flow', () => {
    let branchId: string;
    let userId: string;
    let medicineId: string;
    let supplierId: string;
    let batchEarlyId: string;
    let batchLateId: string;

    before(async () => {
      // Setup test fixtures
      const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
      const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
      const unit = await prisma.unit.findFirst({ where: { name: 'Tablet' } });

      if (!branch || !user || !unit) {
        throw new Error('Database must be seeded before running Tier 3 integration tests');
      }

      branchId = branch.id;
      userId = user.id;

      // Create test medicine
      const testMed = await prisma.medicine.create({
        data: {
          name: `Test Inward Drug ${Date.now()}`,
          genericName: 'Test Generic Inward',
          sku: `SKU-INW-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: unit.id,
          taxPercent: 12,
          isActive: true,
        },
      });
      medicineId = testMed.id;

      // Create test supplier
      const supp = await prisma.supplier.create({
        data: {
          name: `Test Supplier ${Date.now()}`,
          contactPerson: 'Supplier Tester',
          phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          email: `supplier_${Date.now()}@test.com`,
          gstNumber: '29TEST1234F1Z1',
        },
      });
      supplierId = supp.id;
    });

    after(async () => {
      // Clean up created entities
      if (medicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId } });
        await prisma.salesItem.deleteMany({ where: { medicineId } });
        await prisma.purchaseItem.deleteMany({ where: { medicineId } });
        await prisma.batch.deleteMany({ where: { medicineId } });
        await prisma.medicine.delete({ where: { id: medicineId } }).catch(() => {});
      }
      if (supplierId) {
        await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => {});
      }
    });

    it('Step 1: Inward Purchase creates 2 distinct batches with different expiry dates', async () => {
      const earlyExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const lateExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days
      const mfg = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Create Early Batch (15 units @ cost 50, MRP 80)
      const bEarly = await prisma.batch.create({
        data: {
          batchNumber: `INW-EARLY-${Date.now()}`,
          medicineId,
          branchId,
          supplierId,
          mfgDate: mfg,
          expiryDate: earlyExpiry,
          purchasePrice: 50,
          sellingPrice: 80,
          mrp: 90,
          taxPercent: 12,
          initialQty: 15,
          currentQty: 15,
          status: BatchStatus.ACTIVE,
        },
      });
      batchEarlyId = bEarly.id;

      // Create Late Batch (25 units @ cost 55, MRP 80)
      const bLate = await prisma.batch.create({
        data: {
          batchNumber: `INW-LATE-${Date.now()}`,
          medicineId,
          branchId,
          supplierId,
          mfgDate: mfg,
          expiryDate: lateExpiry,
          purchasePrice: 55,
          sellingPrice: 80,
          mrp: 90,
          taxPercent: 12,
          initialQty: 25,
          currentQty: 25,
          status: BatchStatus.ACTIVE,
        },
      });
      batchLateId = bLate.id;

      // Record Inward Stock Movements
      await prisma.stockMovement.createMany({
        data: [
          {
            branchId,
            medicineId,
            batchId: batchEarlyId,
            qty: 15,
            direction: MovementDirection.IN,
            type: StockMovementType.PURCHASE,
            userId,
            reason: 'Inward Purchase Initial Stock',
          },
          {
            branchId,
            medicineId,
            batchId: batchLateId,
            qty: 25,
            direction: MovementDirection.IN,
            type: StockMovementType.PURCHASE,
            userId,
            reason: 'Inward Purchase Initial Stock',
          },
        ],
      });

      assert.ok(batchEarlyId);
      assert.ok(batchLateId);
    });

    it('Step 2: POS Sale of 20 units accurately triggers FEFO allocation across both batches', async () => {
      // Retrieve active batches for medicine ordered by expiryDate asc
      const activeBatches = await prisma.batch.findMany({
        where: {
          medicineId,
          branchId,
          status: BatchStatus.ACTIVE,
          expiryDate: { gt: new Date() },
          currentQty: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });

      const fefoResult = allocateBatchesFefo(activeBatches as any, 20);

      // Verify FEFO logic: 15 from early batch + 5 from late batch
      assert.strictEqual(fefoResult.isFullySatisfied, true);
      assert.strictEqual(fefoResult.allocatedTotal, 20);
      assert.strictEqual(fefoResult.allocations.length, 2);

      assert.strictEqual(fefoResult.allocations[0]?.batchId, batchEarlyId);
      assert.strictEqual(fefoResult.allocations[0]?.allocatedQty, 15);

      assert.strictEqual(fefoResult.allocations[1]?.batchId, batchLateId);
      assert.strictEqual(fefoResult.allocations[1]?.allocatedQty, 5);

      // Execute Sale transaction atomically
      await prisma.$transaction(async (tx) => {
        const invoice = await tx.salesInvoice.create({
          data: {
            invoiceNumber: formatInvoiceNumber('TEST-POS', Math.floor(Math.random() * 100000), 6),
            branchId,
            status: SaleStatus.COMPLETED,
            subtotal: 1600,
            discountAmount: 0,
            taxAmount: 192,
            totalAmount: 1792,
            paymentStatus: 'PAID',
            createdByUserId: userId,
            items: {
              create: fefoResult.allocations.map((a) => ({
                medicineId,
                batchId: a.batchId,
                qty: a.allocatedQty,
                rate: a.sellingPrice,
                mrp: a.sellingPrice,
                taxPercent: a.taxPercent,
                lineTotal: a.sellingPrice * a.allocatedQty * 1.12,
              })),
            },
            payments: {
              create: [
                {
                  amount: 1792,
                  paymentMode: PaymentMode.CASH,
                  createdByUserId: userId,
                },
              ],
            },
          },
        });

        // Deduct batch stocks
        for (const alloc of fefoResult.allocations) {
          await tx.batch.update({
            where: { id: alloc.batchId },
            data: { currentQty: { decrement: alloc.allocatedQty } },
          });

          await tx.stockMovement.create({
            data: {
              branchId,
              medicineId,
              batchId: alloc.batchId,
              qty: alloc.allocatedQty,
              direction: MovementDirection.OUT,
              type: StockMovementType.SALE,
              referenceType: 'SalesInvoice',
              referenceId: invoice.id,
              userId,
              reason: `POS Sale Test Invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      });

      // Verify final batch stock levels in database
      const updatedEarly = await prisma.batch.findUnique({ where: { id: batchEarlyId } });
      const updatedLate = await prisma.batch.findUnique({ where: { id: batchLateId } });

      assert.strictEqual(updatedEarly?.currentQty, 0); // 15 - 15 = 0
      assert.strictEqual(updatedLate?.currentQty, 20); // 25 - 5 = 20
    });
  });
}
