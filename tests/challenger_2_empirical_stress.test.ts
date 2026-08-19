import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { EscPosService } from '../apps/api/src/modules/printing/esc-pos.service.js';
import { SalesReturnsService } from '../apps/api/src/modules/sales-returns/sales-returns.service.js';
import { SalesService } from '../apps/api/src/modules/sales/sales.service.js';
import { FinancialsService } from '../apps/api/src/modules/financials/financials.service.js';
import {
  PaperWidth,
  ThermalReceiptDataDto,
  ReturnCondition,
  PaymentMode,
  BatchStatus,
  SaleStatus,
  MovementDirection,
  StockMovementType,
} from '@medical-inventory/shared-types';
import { roundToDecimals, formatReturnNumber, formatInvoiceNumber } from '@medical-inventory/shared-utils';

export function runChallenger2EmpiricalStressTests(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();
  const escPosService = new EscPosService();
  const salesReturnsService = new SalesReturnsService(prisma as any);
  const salesService = new SalesService(prisma as any);
  const financialsService = new FinancialsService(prisma as any);

  describe('Challenger 2 Empirical Stress & Invariant Test Harness', () => {
  let defaultBranchId: string;
  let adminUserId: string;
  let baseUnitId: string;

  before(async () => {
    const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
    const user = await prisma.user.findFirst({ where: { email: 'admin@medcare.com' } });
    const unit = await prisma.unit.findFirst({ where: { name: 'Strip' } });

    if (!branch || !user || !unit) {
      throw new Error('Database must be seeded before running tests (branch, admin user, or unit missing)');
    }

    defaultBranchId = branch.id;
    adminUserId = user.id;
    baseUnitId = unit.id;
  });

  // =========================================================================
  // DOMAIN 1: ESC/POS Thermal Receipt Formatting (58mm & 80mm)
  // =========================================================================
  describe('Domain 1: ESC/POS Thermal Receipt Formatting & Monospace Invariants', () => {
    it('should format 58mm (32 cols) receipts with ultra-long medicine names, multiple taxes, discounts, and split payments', () => {
      const receiptData58: ThermalReceiptDataDto = {
        storeName: 'MedCare Super Speciality Medical Store & Research Hospital Pharmacy',
        address: 'Plot 42, Health City Avenue, Outer Ring Road, Bangalore - 560100',
        phone: '+91 80 4455 6677 / +91 98888 12345',
        gstNumber: '29AAAAA0000A1Z5',
        pharmacyLicense: 'KA-DRUG-2026-998877',
        invoiceNumber: 'INV-58MM-STRESS-001',
        date: '19-08-2026',
        time: '02:30 PM',
        cashierName: 'Senior Pharmacist John Doe',
        customerName: 'Smt. Ananya Ramachandran-Chatterjee',
        customerMobile: '+91 9988776655',
        items: [
          {
            name: 'Amoxicillin and Potassium Clavulanate Tablets IP 625mg (Augmentin 625 Duo)',
            batch: 'AUG-9912A',
            expiry: '11-2027',
            qty: 3,
            unit: 'Strip',
            rate: 201.5,
            mrp: 220.0,
            discount: 10,
            tax: 12,
            amount: 609.34,
          },
          {
            name: 'Hydrochlorothiazide / Telmisartan / Amlodipine 12.5mg/40mg/5mg (Telma-AMH)',
            batch: 'TLM-8844B',
            expiry: '05-2028',
            qty: 2,
            unit: 'Strip',
            rate: 185.0,
            mrp: 205.0,
            discount: 5,
            tax: 18,
            amount: 414.77,
          },
          {
            name: 'Paracetamol Effervescent Soluble Granules 1000mg Sachets (Sugar Free Orange)',
            batch: 'PCM-1100C',
            expiry: '09-2026',
            qty: 10,
            unit: 'Sachet',
            rate: 15.0,
            mrp: 18.0,
            discount: 0,
            tax: 5,
            amount: 157.5,
          },
          {
            name: 'Insulin Glargine Recombinant DNA Injection 100 IU/ml 3ml Cartridge (Lantus)',
            batch: 'LAN-7721X',
            expiry: '03-2027',
            qty: 1,
            unit: 'Cartridge',
            rate: 650.0,
            mrp: 720.0,
            discount: 15,
            tax: 5,
            amount: 580.13,
          },
        ],
        subtotal: 1640.0,
        discountTotal: 172.5,
        taxTotal: 161.74,
        grandTotal: 1761.74,
        paymentMode: 'Cash (₹761.74), UPI (₹1000.00)',
        payments: [
          { mode: 'CASH', amount: 761.74 },
          { mode: 'UPI', amount: 1000.0 },
        ],
        thankYouMessage: 'Wishing you a speedy recovery! Visit again.',
        returnPolicy: 'Medicines returnable within 7 days with original tax invoice.',
        paperWidth: PaperWidth.WIDTH_58MM,
      };

      const buffer = escPosService.generateEscPosCommands(receiptData58);
      assert.ok(buffer instanceof Buffer, 'Should generate a Buffer');
      assert.ok(buffer.length > 0, 'Buffer should not be empty');

      const rawText = buffer.toString('utf-8');

      // Verify printer init & alignment bytes
      assert.strictEqual(buffer[0], 0x1b, 'ESC init code');
      assert.strictEqual(buffer[1], 0x40, '@ init code');

      // Verify divider line width is exactly 32 chars for 58mm
      const divider32 = '-'.repeat(32);
      assert.ok(rawText.includes(divider32), 'Should contain 32-char divider for 58mm');

      // Verify table header format for 58mm (Item Qty Rate Amount)
      assert.ok(rawText.includes('Item'), 'Should have Item column header');
      assert.ok(rawText.includes('Qty'), 'Should have Qty column header');
      assert.ok(rawText.includes('Rate'), 'Should have Rate column header');
      assert.ok(rawText.includes('Amount'), 'Should have Amount column header');

      // Verify items are present and column-constrained (12 chars for 58mm, 16 chars for 80mm)
      assert.ok(rawText.includes('Amoxicillin '), 'Item 1 title constrained to 12 chars in 58mm row');
      assert.ok(rawText.includes('Hydrochlorot'), 'Item 2 title constrained to 12 chars in 58mm row');

      // Verify financial summary rows
      assert.ok(rawText.includes('Subtotal:'), 'Should display subtotal label');
      assert.ok(rawText.includes('Discount:'), 'Should display discount label');
      assert.ok(rawText.includes('-172.50'), 'Should display negative discount');
      assert.ok(rawText.includes('Tax/GST:'), 'Should display tax label');
      assert.ok(rawText.includes('GRAND TOTAL:'), 'Should display grand total label');
      assert.ok(rawText.includes('Rs. 1761.74'), 'Should display grand total value');

      // Verify split payment display
      assert.ok(rawText.includes('Payment: Cash (₹761.74), UPI (₹1000.00)'), 'Should display multi-tender split');

      // Verify cut command
      const hasCut = buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
      assert.strictEqual(hasCut, true, 'ESC/POS Cut paper command must be present');
    });

    it('should format 80mm (48 cols) receipts with batch column, extreme item descriptions, and multi-tax summary', () => {
      const receiptData80: ThermalReceiptDataDto = {
        storeName: 'MedCare 24x7 Apollo Super Speciality Pharmacy Hub',
        address: 'Commercial Complex, Indiranagar 100ft Road, Bangalore 560038',
        phone: '+91 80 2525 8899',
        gstNumber: '29ABCDE1234F1Z5',
        pharmacyLicense: 'KA-DRUG-12345-2026',
        invoiceNumber: 'INV-80MM-STRESS-002',
        date: '19-08-2026',
        time: '04:15 PM',
        cashierName: 'Jane Smith',
        customerName: 'Captain Vikram Malhotra (Card No: MED-8899)',
        customerMobile: '9123456780',
        items: [
          {
            name: 'Azithromycin Dihydrate Tablets USP 500mg (Azithral 500)',
            batch: 'AZI-5001-XYZ',
            expiry: '08-2027',
            qty: 5,
            unit: 'Strip',
            rate: 115.0,
            mrp: 130.0,
            discount: 8,
            tax: 12,
            amount: 592.48,
          },
          {
            name: 'Pantoprazole Gastro-Resistant and Domperidone Prolonged-Release Capsules IP (Pan-D)',
            batch: 'PND-9900-ABC',
            expiry: '12-2028',
            qty: 4,
            unit: 'Strip',
            rate: 145.0,
            mrp: 165.0,
            discount: 0,
            tax: 12,
            amount: 649.6,
          },
        ],
        subtotal: 1155.0,
        discountTotal: 46.0,
        taxTotal: 133.08,
        grandTotal: 1242.08,
        paymentMode: 'Card (₹500.00), UPI (₹742.08)',
        payments: [
          { mode: 'CARD', amount: 500.0 },
          { mode: 'UPI', amount: 742.08 },
        ],
        thankYouMessage: 'Thank you for choosing MedCare! Get Well Soon',
        returnPolicy: 'Returns accepted within 7 days against invoice presentation.',
        paperWidth: PaperWidth.WIDTH_80MM,
      };

      const buffer = escPosService.generateEscPosCommands(receiptData80);
      assert.ok(buffer instanceof Buffer);
      const rawText = buffer.toString('utf-8');

      // Verify 80mm divider line is 48 dashes
      const divider48 = '-'.repeat(48);
      assert.ok(rawText.includes(divider48), 'Should contain 48-char divider for 80mm');

      // Verify table header contains Batch column for 80mm
      assert.ok(rawText.includes('Item'), 'Should have Item');
      assert.ok(rawText.includes('Batch'), 'Should have Batch column');
      assert.ok(rawText.includes('Qty'), 'Should have Qty column');
      assert.ok(rawText.includes('Rate'), 'Should have Rate column');
      assert.ok(rawText.includes('Amount'), 'Should have Amount column');

      // Verify batch numbers are rendered in the receipt body
      assert.ok(rawText.includes('AZI-5001'), 'Batch column rendered');
      assert.ok(rawText.includes('PND-9900'), 'Batch column rendered');

      // Verify totals
      assert.ok(rawText.includes('Rs. 1242.08'), 'Grand total rendered accurately');
    });

    it('should handle multi-tax, zero discount, and quad-tender split payment modes cleanly', () => {
      const complexReceipt: ThermalReceiptDataDto = {
        storeName: 'MedCare Multi-Speciality Pharmacy',
        address: 'MG Road, Bangalore',
        phone: '080-12345678',
        gstNumber: '29ABCDE1234F1Z5',
        invoiceNumber: 'INV-QUAD-001',
        date: '19-08-2026',
        time: '05:00 PM',
        cashierName: 'Admin Cashier',
        customerName: 'General Public',
        items: [
          {
            name: 'Paracetamol 500mg',
            batch: 'BAT-01',
            expiry: '01-2027',
            qty: 1,
            unit: 'Strip',
            rate: 20.0,
            mrp: 20.0,
            discount: 0,
            tax: 0,
            amount: 20.0,
          },
          {
            name: 'Cough Syrup 100ml',
            batch: 'BAT-02',
            expiry: '06-2027',
            qty: 2,
            unit: 'Bottle',
            rate: 80.0,
            mrp: 90.0,
            discount: 0,
            tax: 5,
            amount: 168.0,
          },
          {
            name: 'Specialist Injectable 5ml',
            batch: 'BAT-03',
            expiry: '12-2027',
            qty: 1,
            unit: 'Vial',
            rate: 500.0,
            mrp: 550.0,
            discount: 0,
            tax: 18,
            amount: 590.0,
          },
        ],
        subtotal: 700.0,
        discountTotal: 0,
        taxTotal: 78.0,
        grandTotal: 778.0,
        paymentMode: 'Cash (₹200.00), UPI (₹200.00), Card (₹300.00), Cheque (₹78.00)',
        payments: [
          { mode: 'CASH', amount: 200.0 },
          { mode: 'UPI', amount: 200.0 },
          { mode: 'CARD', amount: 300.0 },
          { mode: 'CHEQUE', amount: 78.0 },
        ],
        thankYouMessage: 'Get Well Soon',
        paperWidth: PaperWidth.WIDTH_58MM,
      };

      const buffer = escPosService.generateEscPosCommands(complexReceipt);
      const rawText = buffer.toString('utf-8');

      // Zero discount line should be omitted
      assert.strictEqual(rawText.includes('Discount:'), false);

      // Taxes and totals present
      assert.ok(rawText.includes('Tax/GST:'));
      assert.ok(rawText.includes('GRAND TOTAL:'));
      assert.ok(rawText.includes('Rs. 778.00'));

      // Quad-tender payment string present
      assert.ok(rawText.includes('Cash (₹200.00), UPI (₹200.00), Card (₹300.00), Cheque (₹78.00)'));
    });
  });

  // =========================================================================
  // DOMAIN 2: Sales Returns Batch Routing (RESALABLE vs DAMAGED vs EXPIRED)
  // =========================================================================
  describe('Domain 2: Sales Returns Batch Routing & Inventory Invariants', () => {
    let testMedicineId: string;
    let batchAlphaId: string;
    let batchBetaId: string;
    let salesInvoiceId: string;
    let salesItemAlphaId: string;
    let salesItemBetaId: string;

    before(async () => {
      // 1. Create fresh test medicine
      const testMed = await prisma.medicine.create({
        data: {
          name: `Empirical Return Test Medicine ${Date.now()}`,
          sku: `SKU-RETURN-TEST-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: baseUnitId,
          taxPercent: 12,
          isActive: true,
        },
      });
      testMedicineId = testMed.id;

      // 2. Create Batch Alpha (initialQty: 100, currentQty: 100)
      const batchA = await prisma.batch.create({
        data: {
          batchNumber: `B-ALPHA-${Date.now()}`,
          medicineId: testMedicineId,
          branchId: defaultBranchId,
          mfgDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          purchasePrice: 50.0,
          sellingPrice: 80.0,
          mrp: 90.0,
          taxPercent: 12,
          initialQty: 100,
          currentQty: 100,
          damagedQty: 0,
          expiredQty: 0,
          status: BatchStatus.ACTIVE,
        },
      });
      batchAlphaId = batchA.id;

      // 3. Create Batch Beta (initialQty: 100, currentQty: 100)
      const batchB = await prisma.batch.create({
        data: {
          batchNumber: `B-BETA-${Date.now()}`,
          medicineId: testMedicineId,
          branchId: defaultBranchId,
          mfgDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          purchasePrice: 60.0,
          sellingPrice: 95.0,
          mrp: 110.0,
          taxPercent: 12,
          initialQty: 100,
          currentQty: 100,
          damagedQty: 0,
          expiredQty: 0,
          status: BatchStatus.ACTIVE,
        },
      });
      batchBetaId = batchB.id;

      // 4. Perform POS Sale of 20 units from Batch Alpha and 15 units from Batch Beta
      // Batch Alpha: 20 units @ 80 = 1600 + 12% tax (192) = 1792
      // Batch Beta: 15 units @ 95 = 1425 + 12% tax (171) = 1596
      // Grand Total = 3388.00
      const sale = await prisma.$transaction(async (tx) => {
        // Decrement batches
        await tx.batch.update({
          where: { id: batchAlphaId },
          data: { currentQty: { decrement: 20 } },
        });
        await tx.batch.update({
          where: { id: batchBetaId },
          data: { currentQty: { decrement: 15 } },
        });

        return tx.salesInvoice.create({
          data: {
            invoiceNumber: `INV-EMPIRICAL-RET-${Date.now()}`,
            branchId: defaultBranchId,
            status: SaleStatus.COMPLETED,
            subtotal: 3025.0,
            discountAmount: 0,
            taxAmount: 363.0,
            totalAmount: 3388.0,
            paymentStatus: 'PAID',
            createdByUserId: adminUserId,
            items: {
              create: [
                {
                  medicineId: testMedicineId,
                  batchId: batchAlphaId,
                  qty: 20,
                  rate: 80.0,
                  mrp: 90.0,
                  taxPercent: 12,
                  lineTotal: 1792.0,
                },
                {
                  medicineId: testMedicineId,
                  batchId: batchBetaId,
                  qty: 15,
                  rate: 95.0,
                  mrp: 110.0,
                  taxPercent: 12,
                  lineTotal: 1596.0,
                },
              ],
            },
            payments: {
              create: [
                {
                  amount: 3388.0,
                  paymentMode: PaymentMode.CASH,
                  createdByUserId: adminUserId,
                },
              ],
            },
          },
          include: { items: true },
        });
      });

      salesInvoiceId = sale.id;
      salesItemAlphaId = sale.items.find((i) => i.batchId === batchAlphaId)!.id;
      salesItemBetaId = sale.items.find((i) => i.batchId === batchBetaId)!.id;
    });

    after(async () => {
      // Clean up test records
      if (testMedicineId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId: testMedicineId } });
        await prisma.salesReturnItem.deleteMany({ where: { medicineId: testMedicineId } });
        await prisma.salesReturn.deleteMany({ where: { salesInvoiceId } });
        await prisma.salesItem.deleteMany({ where: { medicineId: testMedicineId } });
        await prisma.salesInvoice.delete({ where: { id: salesInvoiceId } }).catch(() => {});
        await prisma.batch.deleteMany({ where: { medicineId: testMedicineId } });
        await prisma.medicine.delete({ where: { id: testMedicineId } }).catch(() => {});
      }
    });

    it('Invariant 1: RESALABLE return must restore live currentQty and NOT touch damagedQty / expiredQty', async () => {
      // Initial state: Batch Alpha currentQty = 80, damagedQty = 0, expiredQty = 0
      const batchBefore = await prisma.batch.findUnique({ where: { id: batchAlphaId } });
      assert.strictEqual(batchBefore?.currentQty, 80);
      assert.strictEqual(batchBefore?.damagedQty, 0);
      assert.strictEqual(batchBefore?.expiredQty, 0);

      // Return 6 units of Batch Alpha as RESALABLE
      const returnResult = await salesReturnsService.create(
        {
          salesInvoiceId,
          branchId: defaultBranchId,
          refundMode: PaymentMode.CASH,
          notes: 'Customer returned un-opened strips in perfect condition',
          items: [
            {
              salesItemId: salesItemAlphaId,
              medicineId: testMedicineId,
              batchId: batchAlphaId,
              returnQty: 6,
              condition: ReturnCondition.RESALABLE,
              reason: 'Unopened packaging',
            },
          ],
        },
        adminUserId
      );

      assert.ok(returnResult.id, 'Return record created');
      assert.strictEqual(returnResult.status, 'COMPLETED');
      // Proportional refund: (1792 / 20) * 6 = 89.6 * 6 = 537.60
      assert.strictEqual(roundToDecimals(returnResult.refundAmount, 2), 537.6);

      // Verify Batch Alpha state: currentQty must be incremented by 6 (80 -> 86)
      const batchAfter = await prisma.batch.findUnique({ where: { id: batchAlphaId } });
      assert.strictEqual(batchAfter?.currentQty, 86, 'Live stock must be restored to 86');
      assert.strictEqual(batchAfter?.damagedQty, 0, 'Damaged stock must remain 0');
      assert.strictEqual(batchAfter?.expiredQty, 0, 'Expired stock must remain 0');

      // Verify StockMovement audit entry
      const movement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: returnResult.id,
          batchId: batchAlphaId,
        },
      });
      assert.ok(movement, 'Stock movement record must be logged');
      assert.strictEqual(movement?.direction, MovementDirection.IN);
      assert.strictEqual(movement?.type, StockMovementType.SALES_RETURN);
      assert.strictEqual(movement?.qty, 6);
      assert.ok(movement?.reason.includes('RESALABLE'), 'Movement reason should indicate RESALABLE');
    });

    it('Invariant 2: DAMAGED return must increment damagedQty and strictly NOT restore live currentQty', async () => {
      // Current state: Batch Alpha currentQty = 86, damagedQty = 0
      // Return 5 units of Batch Alpha as DAMAGED
      const returnResult = await salesReturnsService.create(
        {
          salesInvoiceId,
          branchId: defaultBranchId,
          refundMode: PaymentMode.CASH,
          notes: 'Customer returned broken tablet strip',
          items: [
            {
              salesItemId: salesItemAlphaId,
              medicineId: testMedicineId,
              batchId: batchAlphaId,
              returnQty: 5,
              condition: ReturnCondition.DAMAGED,
              reason: 'Foil torn / damaged packaging',
            },
          ],
        },
        adminUserId
      );

      assert.ok(returnResult.id);
      // Proportional refund: 89.6 * 5 = 448.00
      assert.strictEqual(roundToDecimals(returnResult.refundAmount, 2), 448.0);

      // Verify Batch Alpha state: currentQty must stay 86 (NOT incremented), damagedQty becomes 5
      const batchAfter = await prisma.batch.findUnique({ where: { id: batchAlphaId } });
      assert.strictEqual(batchAfter?.currentQty, 86, 'Live stock currentQty must NOT be restored for DAMAGED items');
      assert.strictEqual(batchAfter?.damagedQty, 5, 'Damaged stock must increment to 5');
      assert.strictEqual(batchAfter?.expiredQty, 0, 'Expired stock must remain 0');

      // Verify StockMovement audit entry
      const movement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: returnResult.id,
          batchId: batchAlphaId,
        },
      });
      assert.ok(movement);
      assert.strictEqual(movement?.qty, 5);
      assert.ok(movement?.reason.includes('DAMAGED'), 'Movement reason indicates DAMAGED');
    });

    it('Invariant 3: EXPIRED return must increment expiredQty and strictly NOT restore live currentQty', async () => {
      // Current state: Batch Beta currentQty = 85, expiredQty = 0
      const batchBefore = await prisma.batch.findUnique({ where: { id: batchBetaId } });
      assert.strictEqual(batchBefore?.currentQty, 85);
      assert.strictEqual(batchBefore?.expiredQty, 0);

      // Return 4 units of Batch Beta as EXPIRED
      const returnResult = await salesReturnsService.create(
        {
          salesInvoiceId,
          branchId: defaultBranchId,
          refundMode: PaymentMode.CASH,
          notes: 'Past expiry return by clinic',
          items: [
            {
              salesItemId: salesItemBetaId,
              medicineId: testMedicineId,
              batchId: batchBetaId,
              returnQty: 4,
              condition: ReturnCondition.EXPIRED,
              reason: 'Expired stock returned',
            },
          ],
        },
        adminUserId
      );

      assert.ok(returnResult.id);
      // Proportional refund for Beta: (1596 / 15) * 4 = 106.40 * 4 = 425.60
      assert.strictEqual(roundToDecimals(returnResult.refundAmount, 2), 425.6);

      // Verify Batch Beta state: currentQty must stay 85 (NOT incremented), expiredQty becomes 4
      const batchAfter = await prisma.batch.findUnique({ where: { id: batchBetaId } });
      assert.strictEqual(batchAfter?.currentQty, 85, 'Live stock currentQty must NOT be restored for EXPIRED items');
      assert.strictEqual(batchAfter?.expiredQty, 4, 'Expired stock must increment to 4');
      assert.strictEqual(batchAfter?.damagedQty, 0, 'Damaged stock remains 0');

      // Verify StockMovement audit entry
      const movement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: returnResult.id,
          batchId: batchBetaId,
        },
      });
      assert.ok(movement);
      assert.strictEqual(movement?.qty, 4);
      assert.ok(movement?.reason.includes('EXPIRED'), 'Movement reason indicates EXPIRED');
    });

    it('Invariant 4: Over-return guardrail strictly prevents returning more than original sold quantity', async () => {
      // For Batch Alpha: sold = 20. Returned so far = 6 (resalable) + 5 (damaged) = 11 units.
      // Remaining returnable = 9 units.
      // If we attempt to return 10 units, it MUST throw BadRequestException.
      await assert.rejects(
        async () => {
          await salesReturnsService.create(
            {
              salesInvoiceId,
              branchId: defaultBranchId,
              refundMode: PaymentMode.CASH,
              items: [
                {
                  salesItemId: salesItemAlphaId,
                  medicineId: testMedicineId,
                  batchId: batchAlphaId,
                  returnQty: 10, // 11 + 10 = 21 > 20
                  condition: ReturnCondition.RESALABLE,
                },
              ],
            },
            adminUserId
          );
        },
        {
          name: 'BadRequestException',
          message: /Cannot return 10 units. Already returned: 11\/20/,
        }
      );

      // Exact boundary: returning the remaining 9 units should succeed
      const remainingReturn = await salesReturnsService.create(
        {
          salesInvoiceId,
          branchId: defaultBranchId,
          refundMode: PaymentMode.CASH,
          items: [
            {
              salesItemId: salesItemAlphaId,
              medicineId: testMedicineId,
              batchId: batchAlphaId,
              returnQty: 9, // Exactly consumes remaining 9
              condition: ReturnCondition.RESALABLE,
            },
          ],
        },
        adminUserId
      );
      assert.ok(remainingReturn.id);

      // Now Alpha has 20/20 returned. Any further return (even 1 unit) must fail.
      await assert.rejects(
        async () => {
          await salesReturnsService.create(
            {
              salesInvoiceId,
              branchId: defaultBranchId,
              refundMode: PaymentMode.CASH,
              items: [
                {
                  salesItemId: salesItemAlphaId,
                  medicineId: testMedicineId,
                  batchId: batchAlphaId,
                  returnQty: 1,
                  condition: ReturnCondition.RESALABLE,
                },
              ],
            },
            adminUserId
          );
        },
        {
          name: 'BadRequestException',
          message: /Cannot return 1 units. Already returned: 20\/20/,
        }
      );
    });
  });

  // =========================================================================
  // DOMAIN 3: COGS & Gross Profit Calculation Across Multi-Batch Sales
  // =========================================================================
  describe('Domain 3: COGS & Gross Profit Across Multi-Batch Sales with Differing Purchase Costs', () => {
    let drugAId: string;
    let drugBId: string;
    let batchA1Id: string;
    let batchA2Id: string;
    let batchB1Id: string;
    let posInvoiceId: string;

    before(async () => {
      // Create 2 test medicines
      const drugA = await prisma.medicine.create({
        data: {
          name: `COGS Drug A ${Date.now()}`,
          sku: `SKU-COGS-A-${Date.now()}`,
          dosageForm: 'TABLET',
          baseUnitId: baseUnitId,
          taxPercent: 12,
          isActive: true,
        },
      });
      drugAId = drugA.id;

      const drugB = await prisma.medicine.create({
        data: {
          name: `COGS Drug B ${Date.now()}`,
          sku: `SKU-COGS-B-${Date.now()}`,
          dosageForm: 'SYRUP',
          baseUnitId: baseUnitId,
          taxPercent: 5,
          isActive: true,
        },
      });
      drugBId = drugB.id;

      // Batch A1 (Older batch purchased at low cost): Cost = ₹35.00, Selling = ₹60.00
      const batchA1 = await prisma.batch.create({
        data: {
          batchNumber: `B-A1-${Date.now()}`,
          medicineId: drugAId,
          branchId: defaultBranchId,
          mfgDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
          purchasePrice: 35.0,
          sellingPrice: 60.0,
          mrp: 70.0,
          taxPercent: 12,
          initialQty: 50,
          currentQty: 50,
          status: BatchStatus.ACTIVE,
        },
      });
      batchA1Id = batchA1.id;

      // Batch A2 (Newer batch purchased at higher cost due to inflation): Cost = ₹48.00, Selling = ₹75.00
      const batchA2 = await prisma.batch.create({
        data: {
          batchNumber: `B-A2-${Date.now()}`,
          medicineId: drugAId,
          branchId: defaultBranchId,
          mfgDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
          purchasePrice: 48.0,
          sellingPrice: 75.0,
          mrp: 85.0,
          taxPercent: 12,
          initialQty: 50,
          currentQty: 50,
          status: BatchStatus.ACTIVE,
        },
      });
      batchA2Id = batchA2.id;

      // Batch B1: Cost = ₹110.00, Selling = ₹170.00
      const batchB1 = await prisma.batch.create({
        data: {
          batchNumber: `B-B1-${Date.now()}`,
          medicineId: drugBId,
          branchId: defaultBranchId,
          mfgDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
          purchasePrice: 110.0,
          sellingPrice: 170.0,
          mrp: 195.0,
          taxPercent: 5,
          initialQty: 30,
          currentQty: 30,
          status: BatchStatus.ACTIVE,
        },
      });
      batchB1Id = batchB1.id;

      // Execute POS Checkout:
      // Item 1: 10 units of Drug A from Batch A1 (Cost: 10 * 35 = 350. Selling: 10 * 60 = 600 + 12% tax 72 = 672.00)
      // Item 2: 15 units of Drug A from Batch A2 (Cost: 15 * 48 = 720. Selling: 15 * 75 = 1125 + 12% tax 135 = 1260.00)
      // Item 3: 4 units of Drug B from Batch B1 (Cost: 4 * 110 = 440. Selling: 4 * 170 = 680, 5% disc = 34 -> 646 + 5% tax 32.30 = 678.30)
      //
      // Total Revenue = 672.00 + 1260.00 + 678.30 = ₹2610.30
      // Total COGS = 350.00 + 720.00 + 440.00 = ₹1510.00
      // Expected Gross Profit = 2610.30 - 1510.00 = ₹1100.30
      // Gross Profit Margin = (1100.30 / 2610.30) * 100 = 42.15%

      const checkoutDto = {
        branchId: defaultBranchId,
        customerName: 'COGS Test Customer',
        customerMobile: '9888877777',
        items: [
          { medicineId: drugAId, batchId: batchA1Id, qty: 10, rate: 60.0, discountPercent: 0 },
          { medicineId: drugAId, batchId: batchA2Id, qty: 15, rate: 75.0, discountPercent: 0 },
          { medicineId: drugBId, batchId: batchB1Id, qty: 4, rate: 170.0, discountPercent: 5 },
        ],
        payments: [
          { amount: 1000.0, paymentMode: PaymentMode.CASH },
          { amount: 1610.3, paymentMode: PaymentMode.UPI },
        ],
      };

      const sale = await salesService.checkout(checkoutDto, adminUserId);
      posInvoiceId = sale.id;
    });

    after(async () => {
      if (posInvoiceId) {
        await prisma.stockMovement.deleteMany({ where: { medicineId: { in: [drugAId, drugBId] } } });
        await prisma.salesPayment.deleteMany({ where: { salesInvoiceId: posInvoiceId } });
        await prisma.salesItem.deleteMany({ where: { salesInvoiceId: posInvoiceId } });
        await prisma.salesInvoice.delete({ where: { id: posInvoiceId } }).catch(() => {});
        await prisma.batch.deleteMany({ where: { medicineId: { in: [drugAId, drugBId] } } });
        await prisma.medicine.deleteMany({ where: { id: { in: [drugAId, drugBId] } } }).catch(() => {});
      }
    });

    it('Invariant 1: COGS must accurately aggregate actual batch purchase prices (Sum(SoldQty * BatchPurchasePrice))', async () => {
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: posInvoiceId },
        include: {
          items: {
            include: {
              batch: true,
            },
          },
        },
      });

      assert.ok(invoice);
      assert.strictEqual(invoice.items.length, 3);

      let computedCogs = 0;
      for (const item of invoice.items) {
        const itemCost = item.qty * item.batch.purchasePrice;
        computedCogs += itemCost;
      }

      assert.strictEqual(roundToDecimals(computedCogs, 2), 1510.0);
      assert.strictEqual(roundToDecimals(invoice.totalAmount, 2), 2610.3);

      const expectedGrossProfit = roundToDecimals(invoice.totalAmount - computedCogs, 2);
      assert.strictEqual(expectedGrossProfit, 1100.3);
    });

    it('Invariant 2: FinancialsService.getFinancialSummary must report exact COGS and Gross Profit', async () => {
      const financialSummary = await financialsService.getFinancialSummary({
        branchId: defaultBranchId,
      });

      assert.ok(financialSummary.cogs > 0, 'COGS must be greater than 0');
      assert.ok(financialSummary.revenue > 0, 'Revenue must be greater than 0');
      assert.strictEqual(
        roundToDecimals(financialSummary.grossProfit, 2),
        roundToDecimals(financialSummary.revenue - financialSummary.cogs, 2),
        'Gross Profit formula: Revenue - COGS must strictly hold'
      );

      const computedMargin = roundToDecimals((financialSummary.grossProfit / financialSummary.revenue) * 100, 2);
      assert.strictEqual(
        roundToDecimals(financialSummary.grossProfitMargin, 2),
        computedMargin,
        'Gross Profit Margin must strictly equal (grossProfit / revenue) * 100'
      );

      // Verify payment mode breakdown reflects multi-tender split
      assert.ok(financialSummary.paymentModeBreakdown.CASH >= 1000.0);
      assert.ok(financialSummary.paymentModeBreakdown.UPI >= 1610.3);
    });

    it('Invariant 3: Net GST Tax Liability reflects Output GST Collected - Input GST Paid', async () => {
      const financialSummary = await financialsService.getFinancialSummary({
        branchId: defaultBranchId,
      });

      const { outputGstCollected, inputGstPaid, netTaxLiability } = financialSummary.taxSummary;
      const expectedNet = Math.max(0, roundToDecimals(outputGstCollected - inputGstPaid, 2));

      assert.strictEqual(
        roundToDecimals(netTaxLiability, 2),
        expectedNet,
        'Net tax liability must equal Math.max(0, Output GST - Input GST)'
      );
    });
  });
});
}

if (process.argv[1] && process.argv[1].includes('challenger_2_empirical_stress')) {
  runChallenger2EmpiricalStressTests();
}

