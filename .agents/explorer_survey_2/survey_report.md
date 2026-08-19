# Phase 2 Architecture Survey & Technical Specification Report
**Project:** Medical Inventory & Pharmacy ERP (Vyapar-Inspired Enhancements)  
**Author:** Explorer Subagent  
**Date:** 2026-08-19  
**Working Directory:** d:/antigravity programme/medical_inventory/.agents/explorer_survey_2  

---

## 1. Executive Summary

This architecture survey provides a complete, production-ready blueprint for implementing the **7 Vyapar-Inspired Medical Features (R3 to R9)** in the Medical Inventory & Pharmacy ERP monorepo (pps/api, pps/web, packages/*).

The system currently runs on:
- **Backend:** NestJS 10 with Prisma ORM 5.22, PostgreSQL (Neon DB).
- **Frontend:** Next.js 14 App Router, TailwindCSS, React Query v5, Zustand, React-Barcode, React-to-Print.
- **Shared Packages:** @medical-inventory/shared-types, @medical-inventory/constants, @medical-inventory/validation, @medical-inventory/shared-utils.

---

## 2. Comprehensive Feature Breakdown (R3 to R9)

### R3: Strip ➔ Tablet ➔ Loose Unit Conversion Engine

#### Current Limitations
- Medicine model has basic fields (oxQty, stripQty, 	abletQty, aseUnitId), but sales stock deduction (SalesService.checkout) and purchase inwarding (PurchasesService.create) directly operate on a single numeric integer quantity without automatic hierarchical unit conversion.
- POS terminal and Cart store assume standard base unit quantities and cannot sell e.g., 3 loose tablets out of a 10-tablet strip or calculate proportional rates automatically.

#### Target Architecture & Schema Blueprint
1. **Packaging Hierarchy**:
   - **Primary Unit:** Outer packaging (e.g., Box, Carton, Pack).
   - **Secondary Unit:** Intermediate packaging (e.g., Strip, Blister, Bottle).
   - **Tertiary Unit / Base Unit:** Smallest indivisible dispensing unit (e.g., Tablet, Capsule, ml, Sachet, Piece).
   - **Conversion Ratios**:
     -  \text{ Primary Unit (Box)} = N \text{ Secondary Units (Strips)}$
     -  \text{ Secondary Unit (Strip)} = M \text{ Tertiary Units (Tablets)}$
     -  \text{ Primary Unit} = (N \times M) \text{ Tertiary Units}$
2. **Stock Tracking Invariant**:
   - All physical inventory quantities in Batch.currentQty, StockMovement.qty, and StockAdjustment.qty are stored and decremented/incremented strictly in **Tertiary Units (Base Units)**.
   - For example: If 1 Strip = 10 Tablets, a stock of 50 tablets is displayed as 5 Strips or 50 Tablets. If a user sells 3 Tablets, the remaining stock becomes 47 Tablets (4 Strips + 7 Tablets).
3. **Database Schema Enhancements (prisma/schema.prisma)**:
   - Enhance Medicine model:
     `prisma
     // In model Medicine:
     stripToTabletRatio  Int       @default(1) @map(strip_to_tablet_ratio) // e.g. 10 tablets per strip
     boxToStripRatio     Int       @default(1) @map(box_to_strip_ratio)    // e.g. 10 strips per box
     primaryUnitName     String?   @default(BOX) @map(primary_unit_name)
     secondaryUnitName   String?   @default(STRIP) @map(secondary_unit_name)
     tertiaryUnitName    String?   @default(TABLET) @map(tertiary_unit_name)
     `
   - Enhance SalesItem & PurchaseItem:
     `prisma
     // In model SalesItem and PurchaseItem:
     selectedUnit        String?   @default(TABLET) @map(selected_unit) // BOX, STRIP, TABLET
     unitConversionFactor Float    @default(1) @map(unit_conversion_factor) // multiplier to get base tablets
     enteredQty          Float     @default(1) @map(entered_qty) // e.g. 2 strips or 3 tabs
     baseQty             Int       @default(1) @map(base_qty)    // enteredQty * unitConversionFactor
     `
4. **Backend Calculation & Deduction Logic**:
   - In shared-utils/src/unit-conversion.ts:
     - calculateBaseQuantity(enteredQty: number, unit: 'BOX' | 'STRIP' | 'TABLET', boxToStrip: number, stripToTablet: number): number
     - calculateUnitRate(baseRate: number, unit: 'BOX' | 'STRIP' | 'TABLET', boxToStrip: number, stripToTablet: number): number
     - ormatPackagingDisplay(totalBaseUnits: number, boxToStrip: number, stripToTablet: number): string (e.g. 2 Boxes, 4 Strips, 3 Tabs)
   - In SalesService.checkout:
     - Calculate aseQty = calculateBaseQuantity(cartItem.qty, cartItem.selectedUnit, ...).
     - Check stock against atch.currentQty >= baseQty.
     - Decrement atch.currentQty by aseQty.
     - Compute line total: $\text{enteredQty} \times \text{unitRate}$.
5. **Frontend UI/UX**:
   - MedicineFormModal (pps/web/src/app/medicines/page.tsx): Section for packaging ratios (Strips per Box, Tablets per Strip, Unit Labels).
   - PosPage & Cart: Unit dropdown selector (Tab, Strip, Box) beside quantity input. Dynamic unit price and live stock badge showing available stock in all units.

---

### R4: Party-Wise Special Pricing & Discount Matrix

#### Current Limitations
- Currently, prices in sales and POS are populated strictly from the medicine's master price or batch selling price.
- No ability to configure pre-negotiated wholesale rates, institutional customer discounts, or supplier purchase contracts.

#### Target Architecture & Schema Blueprint
1. **Prisma Model PartyItemPrice**:
   `prisma
   model PartyItemPrice {
     id              String    @id @default(uuid())
     partyType       String    @default(CUSTOMER) @map(party_type) // CUSTOMER / SUPPLIER
     customerId      String?   @map(customer_id)
     supplierId      String?   @map(supplier_id)
     medicineId      String    @map(medicine_id)
     customPrice     Float?    @map(custom_price)
     discountPercent Float?    @map(discount_percent)
     effectiveFrom   DateTime? @map(effective_from)
     effectiveTo     DateTime? @map(effective_to)
     notes           String?
     createdAt       DateTime  @default(now()) @map(created_at)
     updatedAt       DateTime  @updatedAt @map(updated_at)

     customer        Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
     supplier        Supplier? @relation(fields: [supplierId], references: [id], onDelete: Cascade)
     medicine        Medicine  @relation(fields: [medicineId], references: [id], onDelete: Cascade)

     @@unique([customerId, medicineId])
     @@unique([supplierId, medicineId])
     @@index([customerId])
     @@index([supplierId])
     @@index([medicineId])
     @@map(party_item_prices)
   }
   `
2. **Backend API Endpoints (pps/api/src/modules/party-pricing/)**:
   - GET /party-pricing: Query by customerId, supplierId, or medicineId.
   - POST /party-pricing: Create/upsert party special price.
   - DELETE /party-pricing/:id: Remove special price rule.
   - GET /party-pricing/resolve: Helper endpoint ?partyId=...&partyType=CUSTOMER&medicineId=... returning effective price and discount %.
3. **POS & Sales Auto-Fill Pipeline**:
   - When a customer is selected in POS or Sales invoice, query active party pricing rules for that customer.
   - On adding a medicine to cart, if a special price or discount is defined, override default rate/discount and show a Special Rate tag.
4. **Frontend UI/UX**:
   - In CustomersPage & SuppliersPage: Special Pricing Matrix tab or modal to manage custom medicine rates.
   - In MedicinesPage: Customer Special Rates sub-table.
   - In PosPage: Special price badge showing original MRP vs party special price.

---

### R5: GST Return Reports (GSTR-1, GSTR-3B & HSN Summary)

#### Current Limitations
- Only basic sales, purchases, and inventory valuation reports exist. No GST compliance endpoints or GSTR breakdown exists.

#### Target Architecture & Report Data Structures
1. **GSTR-1 (Outward Supplies Breakdown)**:
   - **B2B Invoices (Table 4)**: Sales to customers with a valid GSTIN (customer.gstNumber != null).
     - Columns: GSTIN, Customer Name, Invoice No, Invoice Date, Invoice Total, Place of Supply, Reverse Charge (N), Tax Rate (%), Taxable Value, CGST Amount, SGST Amount, IGST Amount.
   - **B2C Large (Table 5)**: Inter-state sales > ₹2,50,000 to unregistered persons.
   - **B2C Small (Table 7)**: Intra-state and small inter-state retail sales to unregistered customers grouped by tax slab (0%, 5%, 12%, 18%, 28%).
   - **Document Issued (Table 13)**: Invoice sequence start, end, total count, cancelled count.
2. **GSTR-3B (Monthly Summary Return)**:
   - **Table 3.1: Details of Outward Supplies & Inward Supplies Liable to Reverse Charge**:
     - (a) Outward taxable supplies (other than zero-rated, nil-rated and exempted): Total Taxable Value, IGST, CGST, SGST.
     - (b) Outward taxable supplies (zero-rated).
     - (c) Other outward supplies (Nil-rated, exempted).
   - **Table 4: Eligible Input Tax Credit (ITC)**:
     - Inward supplies from registered suppliers: Total Purchase Taxable Value, IGST, CGST, SGST.
   - **Table 5.1: Net GST Payable**:
     - $\text{Net CGST} = \text{Output CGST} - \text{Input CGST}$
     - $\text{Net SGST} = \text{Output SGST} - \text{Input SGST}$
3. **HSN-wise Summary of Outward Supplies (Table 12)**:
   - Aggregated by medicine.hsnCode, description, and tax rate.
   - Columns: HSN/SAC Code, Description, UQC (e.g. NOS/STRIP/TAB), Total Quantity, Total Value, Taxable Value, Integrated Tax, Central Tax, State/UT Tax, Cess.
4. **Backend Implementation (pps/api/src/modules/reports/)**:
   - GET /reports/gstr1 & GET /reports/gstr1/export/excel (ExcelJS multi-tab workbook: B2B, B2CS, DocSummary).
   - GET /reports/gstr3b & GET /reports/gstr3b/export/excel (ExcelJS GSTR-3B structured summary).
   - GET /reports/hsn-summary & GET /reports/hsn-summary/export/excel.
5. **Frontend UI/UX (pps/web/src/app/reports/page.tsx)**:
   - Tabs: Overview, GSTR-1, GSTR-3B, HSN Summary, Inventory Valuation.
   - Date range pickers (Month selector or custom range) + Branch filter.
   - Live summary KPI cards and tables with Export to Excel (.xlsx) action.

---

### R6: Barcode Label Printing (40mm x 20mm Thermal Labels)

#### Current Limitations
- eact-barcode and eact-to-print are present in dependencies, but there is no dedicated barcode label printing dialog for newly inwarded purchase batches or stock labels.

#### Target Architecture & Technical Specification
1. **Thermal Label Specifications**:
   - Dimensions: **40mm width $\times$ 20mm height** (standard retail pharmacy label).
   - Format: Continuous roll / single column thermal printer (TSC, Zebra, TVS, Xprinter).
   - Content:
     - Line 1: Pharmacy Name (MedCare Pharmacy) - 8px bold
     - Line 2: Medicine Name & Strength (Paracetamol 650mg) - 9px bold, truncated
     - Line 3: Batch No & Exp Date (B: BT204 | E: 12/27) - 8px
     - Line 4: Barcode (Code-128 SVG generated via eact-barcode) - height: 24px, width multiplier: 1.0, no text display
     - Line 5: MRP (MRP: ₹35.00 (Incl. Taxes)) - 8px bold
2. **Print Stylesheet & Component Architecture**:
   - Dedicated component: pps/web/src/components/barcode-label-printer.tsx.
   - CSS Print Media Query:
     `css
     @media print {
       @page {
         size: 40mm 20mm;
         margin: 0mm;
       }
       body {
         margin: 0;
         padding: 0;
       }
       .barcode-label {
         width: 40mm;
         height: 20mm;
         page-break-after: always;
         display: flex;
         flex-direction: column;
         justify-content: center;
         align-items: center;
         overflow: hidden;
         box-sizing: border-box;
         padding: 1mm;
       }
     }
     `
3. **Trigger Points**:
   - In PurchasesPage (pps/web/src/app/purchases/page.tsx):
     - Immediately after creating/saving a purchase invoice, prompt modal: Purchase saved! Print Barcode Labels? with preset quantities matching inward items.
     - Row action button Print Barcode Labels on all past purchases.
   - In InventoryPage (pps/web/src/app/inventory/page.tsx):
     - Print Label button next to any batch.

---

### R7: Schedule H / H1 / X Drug Register (Legal Compliance)

#### Current Limitations
- Medicine has only a boolean prescriptionRequired.
- There is no Drug Schedule classification (Schedule H, Schedule H1, Schedule X, Schedule G, OTC).
- Sales do not record prescribing doctor details or patient prescription info, and there is no legal Drug Register report for regulatory inspections.

#### Target Architecture & Schema Blueprint
1. **Prisma Schema Enhancements**:
   - Add drugSchedule to Medicine:
     `prisma
     // In model Medicine:
     drugSchedule String @default(OTC) @map(drug_schedule) // OTC, SCHEDULE_H, SCHEDULE_H1, SCHEDULE_X, NARCOTIC
     `
   - Add PrescriptionRecord model:
     `prisma
     model PrescriptionRecord {
       id                   String       @id @default(uuid())
       salesInvoiceId       String       @unique @map(sales_invoice_id)
       doctorName           String       @map(doctor_name)
       doctorRegNumber      String?      @map(doctor_reg_number)
       doctorAddress        String?      @map(doctor_address)
       patientName          String       @map(patient_name)
       patientAge           Int?         @map(patient_age)
       patientGender        String?      @map(patient_gender)
       patientAddress       String?      @map(patient_address)
       prescriptionNumber   String?      @map(prescription_number)
       prescriptionDate     DateTime?    @map(prescription_date)
       notes                String?
       createdAt            DateTime     @default(now()) @map(created_at)

       salesInvoice         SalesInvoice @relation(fields: [salesInvoiceId], references: [id], onDelete: Cascade)

       @@map(prescription_records)
     }
     `
2. **Sales / POS Mandatory Prescription Form Trigger**:
   - In useCartStore: Compute hasScheduleDrugs = items.some(item => item.drugSchedule && item.drugSchedule !== 'OTC').
   - In PosPage & Sales invoice form: If hasScheduleDrugs is true, checkout button displays a warning badge and triggers the **Doctor & Prescription Details Modal**.
   - Required fields:
     - Doctor Name (Mandatory)
     - Doctor Medical Registration No (Mandatory for Schedule H1 & X)
     - Patient Name & Age (Mandatory)
     - Prescription Ref / Date (Mandatory)
   - Backend SalesService.checkout validates presence of prescription details when schedule drugs are included, creating PrescriptionRecord within the checkout transaction.
3. **Schedule H / H1 Register Report**:
   - Backend endpoint: GET /reports/schedule-register and GET /reports/schedule-register/export/excel.
   - Regulatory columns (Drugs and Cosmetics Act, 1945):
     1. Date of Dispensing
     2. Patient Name, Age & Address
     3. Prescriber (Doctor) Name & Reg. No.
     4. Drug Name, Strength & Schedule (H / H1 / X)
     5. Manufacturer & Batch Number
     6. Quantity Dispensed
     7. Sales Invoice Number
     8. Pharmacist / Dispenser Signature column

---

### R8: WhatsApp Invoice Sharing & Payment Reminder

#### Current Limitations
- Invoices cannot be directly sent to customer mobile numbers via WhatsApp.
- No automated payment reminder messaging for outstanding customer ledger accounts.

#### Target Architecture & Implementation Plan
1. **Utility Functions (packages/shared-utils/src/whatsapp.ts)**:
   - sanitizeMobileForWhatsApp(mobile: string): string (formats Indian 10-digit number to 91XXXXXXXXXX).
   - uildWhatsAppUrl(mobile: string, text: string): string (constructs https://wa.me/?text=).
   - generateSaleInvoiceMessage(invoice: SaleInvoiceDetails): string.
   - generatePaymentReminderMessage(customer: CustomerBalanceDetails): string.
2. **Message Formats**:
   - **Sale Tax Invoice Message**:
     `	ext
     🏥 *TAX INVOICE - MEDCARE PHARMACY*
     ━━━━━━━━━━━━━━━━━━━━
     📄 *Invoice No:* INV-00042
     📅 *Date:* 19-Aug-2026
     👤 *Patient/Customer:* John Doe
     💰 *Total Amount:* ₹350.00
     💳 *Payment Status:* PAID (UPI)
     ━━━━━━━━━━━━━━━━━━━━
     *Items Purchased:*
     • Augmentin 625 Duo (B: AG99) x 1 Strip - ₹180.00
     • Pan 40mg (B: PN12) x 1 Strip - ₹110.00
     • Paracetamol 650 (B: PC01) x 10 Tabs - ₹60.00
     ━━━━━━━━━━━━━━━━━━━━
     🙏 *Thank you for your purchase! Get well soon.*
     📞 For queries: +91 9876543210
     `
   - **Customer Ledger Payment Reminder Message**:
     `	ext
     🏥 *PAYMENT REMINDER - MEDCARE PHARMACY*
     ━━━━━━━━━━━━━━━━━━━━
     Dear John Doe,
     
     This is a gentle reminder regarding your outstanding pharmacy balance of *₹1,250.00*.
     
     💳 *UPI Payment ID:* medcare@upi
     🏦 *Bank Transfer:* HDFC Bank | A/C: 1234567890 | IFSC: HDFC0001234
     
     Please settle the balance at your earliest convenience. Thank you!
     `
3. **Frontend Action Triggers**:
   - POS Checkout Complete Modal: Prominent 💬 Share Bill on WhatsApp button.
   - SalesPage table rows: WhatsApp action icon on every invoice.
   - CustomersPage table rows: 📲 WhatsApp Reminder button on customers with currentBalance > 0.

---

### R9: Purchase Order (PO) ➔ Inward Bill Auto-Conversion

#### Current Limitations
- Purchases must be manually created from scratch without a preceding Purchase Order procurement cycle.

#### Target Architecture & Schema Blueprint
1. **Prisma Models PurchaseOrder & PurchaseOrderItem**:
   `prisma
   model PurchaseOrder {
     id                   String              @id @default(uuid())
     poNumber             String              @unique @map(po_number)
     supplierId           String              @map(supplier_id)
     branchId             String              @map(branch_id)
     status               String              @default(DRAFT) // DRAFT, SENT, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED
     expectedDeliveryDate DateTime?           @map(expected_delivery_date)
     subtotal             Float               @default(0)
     taxAmount            Float               @default(0) @map(tax_amount)
     totalAmount          Float               @default(0) @map(total_amount)
     notes                String?
     convertedPurchaseId  String?             @map(converted_purchase_id)
     createdByUserId      String              @map(created_by_user_id)
     createdAt            DateTime            @default(now()) @map(created_at)
     updatedAt            DateTime            @updatedAt @map(updated_at)

     supplier             Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
     branch               Branch              @relation(fields: [branchId], references: [id], onDelete: Restrict)
     createdByUser        User                @relation(POCreator, fields: [createdByUserId], references: [id], onDelete: Restrict)
     items                PurchaseOrderItem[]

     @@index([poNumber])
     @@index([status])
     @@map(purchase_orders)
   }

   model PurchaseOrderItem {
     id                   String              @id @default(uuid())
     purchaseOrderId      String              @map(purchase_order_id)
     medicineId           String              @map(medicine_id)
     orderedQty           Int                 @map(ordered_qty)
     receivedQty          Int                 @default(0) @map(received_qty)
     unitId               String?             @map(unit_id)
     expectedRate         Float               @map(expected_rate)
     taxPercent           Float               @default(0) @map(tax_percent)
     lineTotal            Float               @map(line_total)

     purchaseOrder        PurchaseOrder       @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
     medicine             Medicine            @relation(fields: [medicineId], references: [id], onDelete: Restrict)

     @@map(purchase_order_items)
   }
   `
2. **Backend Module (pps/api/src/modules/purchase-orders/)**:
   - POST /purchase-orders: Create PO.
   - GET /purchase-orders: List POs with status/supplier filters.
   - GET /purchase-orders/:id: Detailed PO with ordered items.
   - PATCH /purchase-orders/:id/status: Transition PO status (DRAFT ➔ SENT ➔ CANCELLED).
   - POST /purchase-orders/:id/convert: Returns pre-filled purchase inward payload or converts directly.
3. **1-Click Auto-Conversion Workflow**:
   - User views PO #PO-2026-001 with status SENT.
   - Clicks **⚡ Convert to Purchase Bill**.
   - System navigates to /purchases and opens the Inward Entry modal pre-populated with:
     - Supplier ID and Name
     - PO Reference in Notes
     - All line items (Medicine ID, Ordered Quantities, Expected Rates, Tax %)
   - User enters actual Batch Number, Mfg Date, Expiry Date, and adjusts actual received quantities.
   - Upon saving the Purchase Invoice, the API marks PO as FULLY_RECEIVED (or PARTIALLY_RECEIVED) and links convertedPurchaseId.
4. **Frontend UI/UX (pps/web/src/app/purchase-orders/page.tsx)**:
   - Dedicated PO management view in sidebar navigation.
   - Create PO modal with supplier selection, medicine search, quantity and rate inputs.
   - Status filters, PO printable view, and 1-click Convert action button.

---

## 3. Database Migration & Deployment Plan

1. **Prisma Schema Update**:
   - Modify prisma/schema.prisma with all 4 new models (PartyItemPrice, PrescriptionRecord, PurchaseOrder, PurchaseOrderItem) and modified columns on Medicine, SalesItem, PurchaseItem.
2. **Database Push**:
   - Execute: 
px prisma db push with production Neon DB connection.
   - Execute: 
px prisma generate to refresh @prisma/client.
3. **Turborepo Packages Build**:
   - Build @medical-inventory/shared-types, @medical-inventory/constants, @medical-inventory/validation, @medical-inventory/shared-utils.
4. **Backend & Frontend Build Verification**:
   - NestJS API: 
pm run build --workspace=@medical-inventory/api.
   - Next.js Web: 
pm run build --workspace=@medical-inventory/web.

---

## 4. Implementation Readiness Matrix

| Feature | Schema Ready | Backend Plan | Frontend Plan | Shared Utils / Packages |
|---|---|---|---|---|
| **R3: Unit Conversion** | ✅ Extended Medicine & Items | ✅ Atomic Unit Conversion | ✅ POS & Med Unit Selectors | ✅ Conversion math utils |
| **R4: Party Pricing** | ✅ PartyItemPrice Model | ✅ PartyPricingModule | ✅ Special Price Modals | ✅ Price resolver utils |
| **R5: GST Reports** | ✅ Models support GST fields | ✅ ReportsService ExcelJS | ✅ Multi-tab GST Reports page | ✅ GST constants & calculators |
| **R6: Barcode Printing**| ✅ Schema has barcodes & batches | ✅ Label metadata builder | ✅ 40x20mm thermal print dialog | ✅ eact-barcode / eact-to-print |
| **R7: Schedule H Register** | ✅ PrescriptionRecord Model | ✅ Checkout trigger + Report | ✅ Doctor Modal + Reg Report | ✅ Drug schedule enums |
| **R8: WhatsApp Sharing**| ✅ Existing customer & sale models | ✅ Formatters & builders | ✅ Action buttons & modals | ✅ uildWhatsAppUrl & templates |
| **R9: PO Auto-Conversion** | ✅ PurchaseOrder Models | ✅ PurchaseOrdersModule | ✅ /purchase-orders Page | ✅ PO status & conversion DTOs |

