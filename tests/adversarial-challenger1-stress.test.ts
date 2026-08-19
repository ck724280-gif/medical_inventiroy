import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  allocateBatchesFefo,
  roundToDecimals,
  calculateLineTotal,
  formatCurrency,
  isBatchExpired,
  evaluateBatchStatus,
} from '../packages/shared-utils/src/index.js';
import {
  Batch,
  BatchStatus,
  MovementDirection,
  PaymentMode,
  ReturnCondition,
  StockMovementType,
} from '@medical-inventory/shared-types';

export function runChallenger1AdversarialStressTests(prisma: PrismaClient) {
  describe('🔥 ADVERSARIAL CHALLENGER 1 STRESS HARNESS', () => {
    // =========================================================================
    // SECTION 1: FEFO ALLOCATION ENGINE ADVERSARIAL STRESS TESTING
    // =========================================================================
    describe('FEFO Engine Adversarial Stress Testing', () => {
      it('FEFO-ADV-1: Batches with identical expiry dates should allocate predictably without crashing', () => {
        const sameExpiry = new Date('2028-06-30T00:00:00.000Z');
        const batches: Partial<Batch>[] = [
          {
            id: 'batch-same-1',
            batchNumber: 'BSAME-1',
            expiryDate: sameExpiry,
            currentQty: 20,
            reservedQty: 0,
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 12,
          },
          {
            id: 'batch-same-2',
            batchNumber: 'BSAME-2',
            expiryDate: sameExpiry,
            currentQty: 30,
            reservedQty: 0,
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 12,
          },
          {
            id: 'batch-same-3',
            batchNumber: 'BSAME-3',
            expiryDate: sameExpiry,
            currentQty: 50,
            reservedQty: 0,
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 12,
          },
        ];

        // Request 45 units: should consume batch-same-1 (20) and 25 from batch-same-2
        const result = allocateBatchesFefo(batches as Batch[], 45);
        assert.strictEqual(result.isFullySatisfied, true);
        assert.strictEqual(result.allocatedTotal, 45);
        assert.strictEqual(result.unsatisfiedQty, 0);
        assert.strictEqual(result.allocations.length, 2);
        assert.strictEqual(result.allocations[0]?.batchId, 'batch-same-1');
        assert.strictEqual(result.allocations[0]?.allocatedQty, 20);
        assert.strictEqual(result.allocations[1]?.batchId, 'batch-same-2');
        assert.strictEqual(result.allocations[1]?.allocatedQty, 25);
      });

      it('FEFO-ADV-2: 10-batch cascade allocation with mixed dates, reserved stock, and depleted batches', () => {
        const baseTime = Date.now();
        const batches: Partial<Batch>[] = [];

        // Create 10 batches in scrambled order with various stock and expiry dates
        const offsetsInDays = [90, 10, 365, 5, 60, 20, 180, 15, 30, 45];
        for (let i = 0; i < 10; i++) {
          batches.push({
            id: `batch-${i}`,
            batchNumber: `BN-${i}`,
            expiryDate: new Date(baseTime + offsetsInDays[i]! * 86400000),
            currentQty: 10,
            reservedQty: i % 3 === 0 ? 4 : 0,
            status: BatchStatus.ACTIVE,
            sellingPrice: 50 + i,
            taxPercent: 12,
          });
        }

        // Request 32 units:
        const result = allocateBatchesFefo(batches as Batch[], 32);

        assert.strictEqual(result.isFullySatisfied, true);
        assert.strictEqual(result.allocatedTotal, 32);
        assert.strictEqual(result.allocations.length, 4);

        assert.strictEqual(result.allocations[0]?.batchId, 'batch-3');
        assert.strictEqual(result.allocations[0]?.allocatedQty, 6);

        assert.strictEqual(result.allocations[1]?.batchId, 'batch-1');
        assert.strictEqual(result.allocations[1]?.allocatedQty, 10);

        assert.strictEqual(result.allocations[2]?.batchId, 'batch-7');
        assert.strictEqual(result.allocations[2]?.allocatedQty, 10);

        assert.strictEqual(result.allocations[3]?.batchId, 'batch-5');
        assert.strictEqual(result.allocations[3]?.allocatedQty, 6);
      });

      it('FEFO-ADV-3: Anomaly resilience: reservedQty > currentQty (over-reserved) and negative stock', () => {
        const future = new Date(Date.now() + 86400000 * 30);
        const batches: Partial<Batch>[] = [
          {
            id: 'batch-corrupt-1',
            batchNumber: 'B-OVER-RES',
            expiryDate: future,
            currentQty: 10,
            reservedQty: 25, // Available = -15
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 5,
          },
          {
            id: 'batch-corrupt-2',
            batchNumber: 'B-NEG-STOCK',
            expiryDate: future,
            currentQty: -5,
            reservedQty: 0, // Available = -5
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 5,
          },
          {
            id: 'batch-valid',
            batchNumber: 'B-VALID',
            expiryDate: future,
            currentQty: 15,
            reservedQty: 0,
            status: BatchStatus.ACTIVE,
            sellingPrice: 100,
            taxPercent: 5,
          },
        ];

        const result = allocateBatchesFefo(batches as Batch[], 10);
        assert.strictEqual(result.isFullySatisfied, true);
        assert.strictEqual(result.allocatedTotal, 10);
        assert.strictEqual(result.allocations.length, 1);
        assert.strictEqual(result.allocations[0]?.batchId, 'batch-valid');
        assert.strictEqual(result.allocations[0]?.allocatedQty, 10);
      });

      it('FEFO-ADV-4: Date boundaries & timezone/midnight edge cases', () => {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const today1159PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const yesterday1159PM = new Date(todayMidnight.getTime() - 1);
        const tomorrowMidnight = new Date(todayMidnight.getTime() + 86400000);

        // Yesterday 23:59:59 is expired
        assert.strictEqual(isBatchExpired(yesterday1159PM), true);
        assert.strictEqual(evaluateBatchStatus(yesterday1159PM, BatchStatus.ACTIVE), BatchStatus.EXPIRED);

        // Today (even at start or end of today) has getDaysUntilExpiry >= 0
        assert.strictEqual(isBatchExpired(todayMidnight), false);
        assert.strictEqual(isBatchExpired(today1159PM), false);

        // Tomorrow is not expired
        assert.strictEqual(isBatchExpired(tomorrowMidnight), false);
        assert.strictEqual(evaluateBatchStatus(tomorrowMidnight, BatchStatus.ACTIVE), BatchStatus.ACTIVE);
      });

      it('FEFO-ADV-5: Status override resilience (QUARANTINED / RECALLED / BLOCKED)', () => {
        const future = new Date(Date.now() + 86400000 * 30);
        const past = new Date(Date.now() - 86400000 * 30);

        // Even if expired, QUARANTINED status remains QUARANTINED
        assert.strictEqual(evaluateBatchStatus(past, BatchStatus.QUARANTINED), BatchStatus.QUARANTINED);
        assert.strictEqual(evaluateBatchStatus(past, BatchStatus.BLOCKED), BatchStatus.BLOCKED);
        assert.strictEqual(evaluateBatchStatus(past, BatchStatus.RECALLED), BatchStatus.RECALLED);

        // Non-active batches cannot be allocated even if expiry is far in future
        const batches: Partial<Batch>[] = [
          {
            id: 'b-rec',
            batchNumber: 'B-REC',
            expiryDate: future,
            currentQty: 100,
            reservedQty: 0,
            status: BatchStatus.RECALLED,
            sellingPrice: 10,
            taxPercent: 5,
          },
          {
            id: 'b-exp',
            batchNumber: 'B-EXP',
            expiryDate: past,
            currentQty: 100,
            reservedQty: 0,
            status: BatchStatus.EXPIRED,
            sellingPrice: 10,
            taxPercent: 5,
          },
        ];

        const result = allocateBatchesFefo(batches as Batch[], 10);
        assert.strictEqual(result.isFullySatisfied, false);
        assert.strictEqual(result.allocatedTotal, 0);
        assert.strictEqual(result.allocations.length, 0);
      });
    });

    // =========================================================================
    // SECTION 2: FINANCIAL PRECISION & CURRENCY MATH STRESS TESTING
    // =========================================================================
    describe('Financial Precision & Currency Math Stress Testing', () => {
      it('FIN-ADV-1: High-iteration (10,000 cycles) randomized financial invariant test', () => {
        let failureCount = 0;

        for (let i = 0; i < 10000; i++) {
          const qty = Math.floor(Math.random() * 100) + 1;
          const rate = Math.round((Math.random() * 999 + 0.01) * 100) / 100;
          const discountPct = Math.round(Math.random() * 1000) / 10; // 0% to 100% with 1 decimal
          const taxPct = [0, 5, 12, 18, 28][Math.floor(Math.random() * 5)]!;

          const line = calculateLineTotal(qty, rate, discountPct, taxPct);

          // Invariant 1: subtotal = round(qty * rate)
          const expectedSubtotal = roundToDecimals(qty * rate);
          if (line.subtotal !== expectedSubtotal) failureCount++;

          // Invariant 2: taxableAmount = round(subtotal - discountAmount)
          const expectedTaxable = roundToDecimals(line.subtotal - line.discountAmount);
          if (line.taxableAmount !== expectedTaxable) failureCount++;

          // Invariant 3: total = round(taxableAmount + taxAmount)
          const expectedTotal = roundToDecimals(line.taxableAmount + line.taxAmount);
          if (line.total !== expectedTotal) failureCount++;

          // Invariant 4: No NaN or negative amounts
          if (isNaN(line.total) || line.total < 0) failureCount++;

          // Invariant 5: Max 2 decimal places
          const decimalStr = line.total.toString().split('.')[1] || '';
          if (decimalStr.length > 2) failureCount++;
        }

        assert.strictEqual(failureCount, 0, `Encountered ${failureCount} invariant violations in 10,000 cycles`);
      });

      it('FIN-ADV-2: Sub-cent rounding thresholds and fractional rates', () => {
        // 0.005 -> 0.01
        assert.strictEqual(roundToDecimals(0.005, 2), 0.01);
        // 0.0049999 -> 0.00
        assert.strictEqual(roundToDecimals(0.0049999, 2), 0.0);
        // 100.005 -> 100.01
        assert.strictEqual(roundToDecimals(100.005, 2), 100.01);
        // 100.0049 -> 100.00
        assert.strictEqual(roundToDecimals(100.0049, 2), 100.0);

        // Weird tax rate (e.g. 2.75% composite tax)
        const line = calculateLineTotal(7, 13.33, 3.5, 2.75);
        assert.strictEqual(line.subtotal, 93.31);
        assert.strictEqual(line.discountAmount, 3.27);
        assert.strictEqual(line.taxableAmount, 90.04);
        assert.strictEqual(line.taxAmount, 2.48);
        assert.strictEqual(line.total, 92.52);
      });

      it('FIN-ADV-3: 5-Tender split payment with complex fractional splits', () => {
        const line1 = calculateLineTotal(13, 77.77, 7.5, 18);
        const line2 = calculateLineTotal(9, 149.50, 12, 12);
        const line3 = calculateLineTotal(3, 899.99, 5, 5);

        const billSubtotal = roundToDecimals(line1.total + line2.total + line3.total, 2);

        // Invoice discount: 3.25%
        const invDiscount = roundToDecimals((billSubtotal * 3.25) / 100, 2);
        const finalGrandTotal = roundToDecimals(billSubtotal - invDiscount, 2);

        // 5-way split: Cash, UPI, Card, NetBanking, Cheque
        const p1 = roundToDecimals(finalGrandTotal * 0.2, 2);
        const p2 = roundToDecimals(finalGrandTotal * 0.25, 2);
        const p3 = roundToDecimals(finalGrandTotal * 0.15, 2);
        const p4 = roundToDecimals(finalGrandTotal * 0.3, 2);
        const p5 = roundToDecimals(finalGrandTotal - (p1 + p2 + p3 + p4), 2); // Exact remainder

        const payments = [
          { mode: PaymentMode.CASH, amount: p1 },
          { mode: PaymentMode.UPI, amount: p2 },
          { mode: PaymentMode.CARD, amount: p3 },
          { mode: PaymentMode.NET_BANKING, amount: p4 },
          { mode: PaymentMode.CHEQUE, amount: p5 },
        ];

        const sumPaid = roundToDecimals(payments.reduce((acc, p) => acc + p.amount, 0), 2);
        assert.strictEqual(sumPaid, finalGrandTotal);
        assert.strictEqual(sumPaid >= finalGrandTotal, true);
      });
    });

    // =========================================================================
    // SECTION 3: TRANSACTION ATOMICITY & ROLLBACK STRESS TESTING
    // =========================================================================
    describe('Database Transaction Atomicity & Rollback Stress Testing', () => {
      let branchId: string;
      let userId: string;
      let unitId: string;
      let medicineAId: string;
      let batchAId: string;
      let medicineBId: string;
      let batchBId: string;

      before(async () => {
        const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
        const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
        const unit = await prisma.unit.findFirst({ where: { name: 'Tablet' } });

        branchId = branch!.id;
        userId = user!.id;
        unitId = unit!.id;

        // Create Drug A with 50 units in Batch A
        const medA = await prisma.medicine.create({
          data: {
            name: `Atom-Stress Drug A ${Date.now()}`,
            sku: `SKU-ATOMA-${Date.now()}`,
            dosageForm: 'TABLET',
            baseUnitId: unitId,
            taxPercent: 12,
            isActive: true,
          },
        });
        medicineAId = medA.id;

        const batchA = await prisma.batch.create({
          data: {
            batchNumber: `BA-${Date.now()}`,
            medicineId: medicineAId,
            branchId,
            mfgDate: new Date(Date.now() - 30 * 86400000),
            expiryDate: new Date(Date.now() + 180 * 86400000),
            purchasePrice: 40,
            sellingPrice: 80,
            mrp: 90,
            taxPercent: 12,
            initialQty: 50,
            currentQty: 50,
            status: BatchStatus.ACTIVE,
          },
        });
        batchAId = batchA.id;

        // Create Drug B with 10 units in Batch B
        const medB = await prisma.medicine.create({
          data: {
            name: `Atom-Stress Drug B ${Date.now()}`,
            sku: `SKU-ATOMB-${Date.now()}`,
            dosageForm: 'TABLET',
            baseUnitId: unitId,
            taxPercent: 18,
            isActive: true,
          },
        });
        medicineBId = medB.id;

        const batchB = await prisma.batch.create({
          data: {
            batchNumber: `BB-${Date.now()}`,
            medicineId: medicineBId,
            branchId,
            mfgDate: new Date(Date.now() - 30 * 86400000),
            expiryDate: new Date(Date.now() + 180 * 86400000),
            purchasePrice: 100,
            sellingPrice: 200,
            mrp: 220,
            taxPercent: 18,
            initialQty: 10,
            currentQty: 10,
            status: BatchStatus.ACTIVE,
          },
        });
        batchBId = batchB.id;
      });

      after(async () => {
        // Clean up test data
        const medIds = [medicineAId, medicineBId].filter(Boolean);
        for (const mId of medIds) {
          await prisma.stockMovement.deleteMany({ where: { medicineId: mId } });
          await prisma.salesReturnItem.deleteMany({ where: { medicineId: mId } });
          await prisma.salesItem.deleteMany({ where: { medicineId: mId } });
          await prisma.batch.deleteMany({ where: { medicineId: mId } });
          await prisma.medicine.delete({ where: { id: mId } }).catch(() => {});
        }
      });

      it('ATOM-ADV-1: Multi-item POS sale aborts and completely rolls back Drug A deduction when Drug B fails', async () => {
        const initialBatchA = await prisma.batch.findUnique({ where: { id: batchAId } });
        const initialBatchB = await prisma.batch.findUnique({ where: { id: batchBId } });

        const stockABefore = initialBatchA!.currentQty; // 50
        const stockBBefore = initialBatchB!.currentQty; // 10

        let caughtError = false;

        try {
          await prisma.$transaction(async (tx) => {
            // 1. Drug A: 20 units requested -> succeeds
            await tx.batch.update({
              where: { id: batchAId },
              data: { currentQty: { decrement: 20 } },
            });

            await tx.stockMovement.create({
              data: {
                branchId,
                medicineId: medicineAId,
                batchId: batchAId,
                qty: 20,
                direction: MovementDirection.OUT,
                type: StockMovementType.SALE,
                userId,
                reason: 'Multi-item partial step A',
              },
            });

            // 2. Drug B: 25 units requested -> FAILS (only 10 available)
            const currentBatchB = await tx.batch.findUnique({ where: { id: batchBId } });
            if (currentBatchB!.currentQty < 25) {
              throw new Error(`INSUFFICIENT_STOCK_BATCH_B: Requested 25, Available ${currentBatchB!.currentQty}`);
            }

            await tx.batch.update({
              where: { id: batchBId },
              data: { currentQty: { decrement: 25 } },
            });
          });
        } catch (err: any) {
          if (err.message.includes('INSUFFICIENT_STOCK_BATCH_B')) {
            caughtError = true;
          }
        }

        assert.strictEqual(caughtError, true);

        // Verify Drug A stock was NOT deducted permanently
        const rolledBackA = await prisma.batch.findUnique({ where: { id: batchAId } });
        assert.strictEqual(rolledBackA?.currentQty, stockABefore);

        // Verify Drug B stock remains untouched
        const rolledBackB = await prisma.batch.findUnique({ where: { id: batchBId } });
        assert.strictEqual(rolledBackB?.currentQty, stockBBefore);

        // Verify no orphaned stock movements
        const orphanMovements = await prisma.stockMovement.findMany({
          where: {
            batchId: batchAId,
            reason: 'Multi-item partial step A',
          },
        });
        assert.strictEqual(orphanMovements.length, 0);
      });

      it('ATOM-ADV-2: Sales return failure rolls back stock restore and refund records', async () => {
        // 1. Perform successful sale of 10 units of Drug A
        const saleResult = await prisma.$transaction(async (tx) => {
          const inv = await tx.salesInvoice.create({
            data: {
              invoiceNumber: `INV-RET-TEST-${Date.now()}`,
              branchId,
              status: 'COMPLETED',
              subtotal: 800,
              discountAmount: 0,
              taxAmount: 96,
              totalAmount: 896,
              paymentStatus: 'PAID',
              createdByUserId: userId,
              items: {
                create: [
                  {
                    medicineId: medicineAId,
                    batchId: batchAId,
                    qty: 10,
                    rate: 80,
                    mrp: 90,
                    discountPercent: 0,
                    taxPercent: 12,
                    lineTotal: 896,
                  },
                ],
              },
            },
            include: { items: true },
          });

          await tx.batch.update({
            where: { id: batchAId },
            data: { currentQty: { decrement: 10 } },
          });

          return inv;
        });

        const batchAfterSale = await prisma.batch.findUnique({ where: { id: batchAId } });
        const stockAfterSale = batchAfterSale!.currentQty; // 40

        // 2. Attempt Sales Return with intentional failure mid-way
        let returnFailed = false;
        try {
          await prisma.$transaction(async (tx) => {
            // Restore stock
            await tx.batch.update({
              where: { id: batchAId },
              data: { currentQty: { increment: 5 } },
            });

            // Stock movement
            await tx.stockMovement.create({
              data: {
                branchId,
                medicineId: medicineAId,
                batchId: batchAId,
                qty: 5,
                direction: MovementDirection.IN,
                type: StockMovementType.SALES_RETURN,
                userId,
                reason: 'Simulated return rollback test',
              },
            });

            // Intentionally throw database constraint violation or error
            throw new Error('SIMULATED_RETURN_FAILURE_MID_TRANSACTION');
          });
        } catch (err: any) {
          if (err.message === 'SIMULATED_RETURN_FAILURE_MID_TRANSACTION') {
            returnFailed = true;
          }
        }

        assert.strictEqual(returnFailed, true);

        // Verify stock was NOT restored (remains at 40, not 45)
        const batchAfterFailedReturn = await prisma.batch.findUnique({ where: { id: batchAId } });
        assert.strictEqual(batchAfterFailedReturn?.currentQty, stockAfterSale);

        // Verify no orphaned stock movements
        const orphanReturnMovements = await prisma.stockMovement.findMany({
          where: {
            batchId: batchAId,
            reason: 'Simulated return rollback test',
          },
        });
        assert.strictEqual(orphanReturnMovements.length, 0);

        // Clean up test invoice
        await prisma.salesItem.deleteMany({ where: { salesInvoiceId: saleResult.id } });
        await prisma.salesInvoice.delete({ where: { id: saleResult.id } });
      });
    });
  });
}
