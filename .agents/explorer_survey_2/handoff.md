# Phase 2 Architecture Survey Handoff Report

**Task:** Phase 2 Investigation (7 Vyapar-inspired Medical Features: R3 to R9)  
**Author:** Explorer Subagent  
**Date:** 2026-08-19  
**Handoff Type:** Hard (Complete Investigation)  

---

## 1. Observation

### 1.1 Database Schema (prisma/schema.prisma)
- Medicine model has aseUnitId, packSize, oxQty, stripQty, 	abletQty, and prescriptionRequired: Boolean, but lacks explicit conversion multipliers (stripToTabletRatio, oxToStripRatio) and Drug Schedule classification (drugSchedule: OTC | SCHEDULE_H | SCHEDULE_H1 | SCHEDULE_X).
- Batch model stores currentQty: Int which represents base units.
- SalesItem and PurchaseItem store a flat qty: Int without recording the chosen unit level (selectedUnit) or conversion multiplier (unitConversionFactor).
- SalesInvoice lacks structured prescription records for Schedule H compliance.
- No PartyItemPrice, PrescriptionRecord, PurchaseOrder, or PurchaseOrderItem models exist yet.

### 1.2 Backend API (pps/api/src/modules/)
- SalesService.checkout (sales.service.ts:100-340) handles transaction creation and FEFO batch deduction, directly decrementing atch.currentQty by item.qty.
- PurchasesService.create (purchases.service.ts:110-180) upserts batches and increments atch.currentQty by item.qty.
- ReportsService (eports.service.ts) has ExcelJS integrated with inventory export, but lacks GSTR-1, GSTR-3B, HSN summary, and Schedule H register endpoints.
- PrintingService (printing.service.ts) generates ESC/POS thermal receipts, but there is no endpoint or template for 40mm x 20mm medicine shelf barcode labels.
- CustomersService and SuppliersService have standard CRUD without party-item pricing matrix endpoints.

### 1.3 Shared Packages (packages/*)
- @medical-inventory/shared-types: Contains core enums (DosageForm, BatchStatus, PaymentMode, PaperWidth, BarcodeType), but lacks DrugSchedule, PurchaseOrderStatus, PartyType.
- @medical-inventory/shared-utils: Contains financial math (calculateLineTotal), date formatting, invoice numbering, and FEFO allocation (llocateBatchesFefo), but lacks unit conversion helpers and WhatsApp URL builders.
- exceljs is installed in pps/api/package.json (^4.4.0).
- eact-barcode (^1.5.3) and eact-to-print (^3.0.2) are already installed in pps/web/package.json.

### 1.4 Frontend App (pps/web/src/app/)
- pos/page.tsx & cart-store.ts: Supports barcode scan and FEFO sales, but lacks unit selection dropdown, special price auto-fill, Schedule H prescription trigger modal, and WhatsApp share buttons.
- medicines/page.tsx: Supports medicine CRUD, but lacks packaging unit ratios and customer special price matrix.
- purchases/page.tsx: Supports purchase inwarding, but lacks unit selection, barcode label print trigger, and PO auto-conversion integration.
- eports/page.tsx: Has Financial and Inventory tabs, but lacks GSTR-1, GSTR-3B, HSN Summary, and Schedule H tabs.
- customers/page.tsx: Supports customer CRUD, but lacks WhatsApp payment reminder button and special price rules.
- /purchase-orders: Page does not exist yet.

---

## 2. Logic Chain

1. **R3: Unit Conversion Engine**:
   - Because physical inventory is discrete and must be tracked atomically to prevent partial fractional sync bugs, the base unit (Tertiary Unit, e.g., Tablet) must remain the single source of truth in Batch.currentQty.
   - By adding stripToTabletRatio and oxToStripRatio to Medicine, and selectedUnit, unitConversionFactor, enteredQty, and aseQty to SalesItem and PurchaseItem, any transaction can be accepted in Box/Strip/Tablet, auto-calculating rates and decrementing/incrementing exact base units atomically.
2. **R4: Party-Wise Special Pricing**:
   - By creating PartyItemPrice with unique constraints (customerId, medicineId) and (supplierId, medicineId), party-specific custom rates and discounts can be indexed efficiently.
   - Integrating price resolution into SalesService and the POS frontend ensures that selecting a party immediately auto-fills negotiated pricing.
3. **R5: GST Return Reports**:
   - Because SalesInvoice, SalesItem, PurchaseInvoice, and PurchaseItem already record taxable values, tax percentages, and customer GSTINs, GSTR-1 (B2B vs B2C), GSTR-3B (Output vs ITC), and HSN summary can be aggregated using Prisma queries and exported to multi-sheet Excel files via ExcelJS.
4. **R6: Barcode Label Printing**:
   - Because eact-barcode and eact-to-print are already present in pps/web, a 40mm x 20mm thermal print component with @page { size: 40mm 20mm; margin: 0; } can render Code-128 SVG barcodes, batch number, expiry date, MRP, and medicine name for continuous-roll thermal printers upon purchase inwarding.
5. **R7: Schedule H/H1 Drug Register**:
   - Marking Medicine.drugSchedule as SCHEDULE_H, SCHEDULE_H1, or SCHEDULE_X enables POS/Sales validation to require doctor name, registration number, patient details, and prescription reference before checkout, persisting into PrescriptionRecord and populating the legal Schedule H Register report.
6. **R8: WhatsApp Sharing & Reminders**:
   - Standardizing uildWhatsAppUrl with encoded message templates allows 1-click sharing of tax invoices on wa.me/<mobile> upon sale completion, and payment reminder generation from the Customers ledger.
7. **R9: Purchase Order Auto-Conversion**:
   - Adding PurchaseOrder and PurchaseOrderItem models enables creating procurement orders in DRAFT or SENT status.
   - The 1-click conversion workflow pre-populates a Purchase Inward entry with PO items, allowing the pharmacist to fill batch/expiry details and adjust received quantities before saving, automatically marking the PO as FULLY_RECEIVED.

---

## 3. Caveats

1. **Database Schema Application**:
   - When modifying prisma/schema.prisma, 
px prisma db push should be used against the Neon PostgreSQL database to apply new models and fields without data loss.
2. **Backward Compatibility**:
   - Existing medicines without configured unit conversion ratios will default stripToTabletRatio = 1 and oxToStripRatio = 1, behaving as standard single-unit items.
3. **Printer Hardware Variance**:
   - Thermal label printers differ in DPI (203 DPI vs 300 DPI). The CSS stylesheet for 40mm x 20mm uses exact physical metric units (mm) and vector SVG barcodes to ensure crisp printing on all standard thermal label printers.

---

## 4. Conclusion

The architectural investigation for Phase 2 is complete. All 7 requirements have clear, non-conflicting database schema definitions, backend NestJS controller/service designs, frontend Next.js App Router integrations, and shared package utilities. The complete specification is documented in survey_report.md.

---

## 5. Verification Method

To verify the implementation once executed:
1. **Prisma DB Push & Client Generation**:
   `ash
   npx prisma db push
   npx prisma generate
   `
2. **Build Verification Across Monorepo**:
   `ash
   npm run build --workspace=@medical-inventory/shared-types
   npm run build --workspace=@medical-inventory/constants
   npm run build --workspace=@medical-inventory/shared-utils
   npm run build --workspace=@medical-inventory/validation
   npm run build --workspace=@medical-inventory/api
   npm run build --workspace=@medical-inventory/web
   `
3. **E2E Feature Verification Matrix**:
   - **R3 (Unit Conversion):** Create medicine with 1 Box = 10 Strips, 1 Strip = 10 Tablets. Purchase 2 Boxes (adds 200 Tablets). Sell 3 Tablets in POS -> Stock remaining = 197 Tablets.
   - **R4 (Party Pricing):** Configure Customer A special price ₹80 for Medicine X (MRP ₹100). Select Customer A in POS -> Rate auto-populates ₹80.
   - **R5 (GST Reports):** Open /reports, switch to GSTR-1, GSTR-3B, and HSN tabs, verify calculations, and download .xlsx files.
   - **R6 (Barcode Printing):** Inward a purchase, click Print Barcode Labels, verify 40mm x 20mm label dialog and Code-128 SVG render.
   - **R7 (Schedule H Register):** Add Schedule H1 medicine in POS -> Verify prescription modal is enforced -> Verify sale appears in Schedule H Register report.
   - **R8 (WhatsApp Share):** Click Share on WhatsApp on saved sale -> Verify wa.me URL contains formatted message with invoice details.
   - **R9 (PO Conversion):** Create PO -> Click Convert to Purchase Bill -> Verify purchase inward entry opens pre-populated -> Save purchase and verify PO status updates to FULLY_RECEIVED.
