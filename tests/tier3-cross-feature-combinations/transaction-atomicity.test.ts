import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { BatchStatus, MovementDirection, StockMovementType } from '@medical-inventory/shared-types';

export function runTransactionAtomicityTests(prisma: PrismaClient) {
  describe('Tier 3 - Database Transaction Atomicity ($transaction rollback)', () => {
    let branchId: string;
    let userId: string;
    let medicineId: string;
    let batchId: string;

    before(async () => {
      const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
      const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
      const unit = await prisma.unit.findFirst({ where: { name: 'Tablet' } });

      branchId = branch!.id;
      userId = user!.id;

      const med = await prisma.medicine.create({
        data: {
          name: `Atomicity Test Drug ${Date.now()}`,
          sku: `SKU-ATOM-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: unit!.id,
          taxPercent: 18,
          isActive: true,
        },
      });
      medicineId = med.id;

      const batch = await prisma.batch.create({
        data: {
          batchNumber: `ATOM-B-${Date.now()}`,
          medicineId,
          branchId,
          mfgDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          purchasePrice: 20,
          sellingPrice: 50,
          mrp: 60,
          taxPercent: 18,
          initialQty: 100,
          currentQty: 100,
          status: BatchStatus.ACTIVE,
        },
      });
      batchId = batch.id;
    });

    after(async () => {
      if (medicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId } });
        await prisma.salesItem.deleteMany({ where: { medicineId } });
        await prisma.batch.deleteMany({ where: { medicineId } });
        await prisma.medicine.delete({ where: { id: medicineId } }).catch(() => {});
      }
    });

    it('should completely roll back stock deductions and stock movements if transaction fails midway', async () => {
      const initialBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      const initialStock = initialBatch!.currentQty;

      let caughtError = false;

      try {
        await prisma.$transaction(async (tx) => {
          // 1. Deduct stock
          await tx.batch.update({
            where: { id: batchId },
            data: { currentQty: { decrement: 30 } },
          });

          // 2. Create StockMovement
          await tx.stockMovement.create({
            data: {
              branchId,
              medicineId,
              batchId,
              qty: 30,
              direction: MovementDirection.OUT,
              type: StockMovementType.SALE,
              userId,
              reason: 'Simulated atomic test',
            },
          });

          // 3. Intentionally throw error (simulating payment gateway failure or constraint violation)
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        });
      } catch (err: any) {
        if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
          caughtError = true;
        }
      }

      assert.strictEqual(caughtError, true);

      // Verify rollback: stock remains untouched at initialStock
      const rolledBackBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      assert.strictEqual(rolledBackBatch?.currentQty, initialStock);

      // Verify no orphaned stock movement exists
      const movements = await prisma.stockMovement.findMany({
        where: { batchId, reason: 'Simulated atomic test' },
      });
      assert.strictEqual(movements.length, 0);
    });
  });
}
