const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Update User model
if (!schema.includes('createdPurchaseOrders PurchaseOrder[]')) {
  schema = schema.replace(
    '  uploads          FileUpload[]',
    '  uploads          FileUpload[]\n  createdPurchaseOrders PurchaseOrder[]  @relation("POCreator")'
  );
}

// 2. Update Branch model
if (!schema.includes('purchaseOrders PurchaseOrder[]')) {
  schema = schema.replace(
    '  purchaseReturns PurchaseReturn[]',
    '  purchaseReturns PurchaseReturn[]\n  purchaseOrders PurchaseOrder[]'
  );
}

// 3. Update Medicine model
if (!schema.includes('stripsPerBox')) {
  schema = schema.replace(
    '  tabletQty            Int?              @map("tablet_qty")',
    '  tabletQty            Int?              @map("tablet_qty")\n  stripsPerBox         Int?              @default(10) @map("strips_per_box")\n  tabletsPerStrip      Int?              @default(10) @map("tablets_per_strip")\n  drugSchedule         String            @default("OTC") @map("drug_schedule")\n  isScheduleH          Boolean           @default(false) @map("is_schedule_h")\n  isScheduleH1         Boolean           @default(false) @map("is_schedule_h1")\n  isScheduleX          Boolean           @default(false) @map("is_schedule_x")'
  );
  schema = schema.replace(
    '  salesReturnItems     SalesReturnItem[]',
    '  salesReturnItems     SalesReturnItem[]\n  partyPrices          PartyItemPrice[]\n  purchaseOrderItems   PurchaseOrderItem[]'
  );
}

// 4. Update Supplier model
if (!schema.includes('purchases      PurchaseInvoice[]\n  returns        PurchaseReturn[]\n  partyPrices')) {
  schema = schema.replace(
    '  returns        PurchaseReturn[]',
    '  returns        PurchaseReturn[]\n  partyPrices    PartyItemPrice[]\n  purchaseOrders PurchaseOrder[]'
  );
}

// 5. Update Customer model
if (!schema.includes('currentBalance Float')) {
  schema = schema.replace(
    '  notes        String?',
    '  gstNumber    String?        @map("gst_number")\n  openingBalance Float        @default(0) @map("opening_balance")\n  currentBalance Float        @default(0) @map("current_balance")\n  notes        String?'
  );
  schema = schema.replace(
    '  returns      SalesReturn[]',
    '  returns      SalesReturn[]\n  partyPrices  PartyItemPrice[]'
  );
}

// 6. Update PurchaseInvoice model
if (!schema.includes('purchaseOrderId')) {
  schema = schema.replace(
    '  returns          PurchaseReturn[]',
    '  returns          PurchaseReturn[]\n  purchaseOrderId  String?           @map("purchase_order_id")\n  purchaseOrder    PurchaseOrder?    @relation(fields: [purchaseOrderId], references: [id], onDelete: SetNull)'
  );
}

// 7. Update PurchaseItem model
if (!schema.includes('conversionRatio')) {
  schema = schema.replace(
    '  lineTotal         Float              @map("line_total")',
    '  selectedQuantity  Float?             @map("selected_quantity")\n  conversionRatio   Float?             @default(1) @map("conversion_ratio")\n  lineTotal         Float              @map("line_total")'
  );
}

// 8. Update SalesInvoice model
if (!schema.includes('prescriptionRecord')) {
  schema = schema.replace(
    '  returns         SalesReturn[]',
    '  returns         SalesReturn[]\n  prescriptionRecord PrescriptionRecord?\n  customerGstin   String?           @map("customer_gstin")\n  isB2B           Boolean           @default(false) @map("is_b2b")'
  );
}

// 9. Update SalesItem model
if (!schema.includes('conversionRatio')) {
  schema = schema.replace(
    '  lineTotal       Float             @map("line_total")',
    '  selectedQuantity Float?            @map("selected_quantity")\n  conversionRatio  Float?            @default(1) @map("conversion_ratio")\n  lineTotal       Float             @map("line_total")'
  );
}

// 10. Append new models if not present
if (!schema.includes('model PartyItemPrice')) {
  const newModels = `
// ============================================================
// 10. VYAPAR-INSPIRED MEDICAL ERP EXTENSIONS
// ============================================================

model PartyItemPrice {
  id              String    @id @default(uuid())
  partyType       String    @default("CUSTOMER") @map("party_type") // CUSTOMER / SUPPLIER
  customerId      String?   @map("customer_id")
  supplierId      String?   @map("supplier_id")
  medicineId      String    @map("medicine_id")
  customPrice     Float     @map("custom_price")
  discountPercent Float     @default(0) @map("discount_percent")
  effectiveFrom   DateTime  @default(now()) @map("effective_from")
  effectiveTo     DateTime? @map("effective_to")
  isActive        Boolean   @default(true) @map("is_active")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  customer        Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
  supplier        Supplier? @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  medicine        Medicine  @relation(fields: [medicineId], references: [id], onDelete: Cascade)

  @@index([customerId, medicineId])
  @@index([supplierId, medicineId])
  @@map("party_item_prices")
}

model PrescriptionRecord {
  id                 String       @id @default(uuid())
  salesInvoiceId     String       @unique @map("sales_invoice_id")
  doctorName         String       @map("doctor_name")
  doctorRegNo        String       @map("doctor_reg_no")
  patientName        String       @map("patient_name")
  patientAge         Int          @map("patient_age")
  patientAddress     String?      @map("patient_address")
  prescriptionNumber String?      @map("prescription_number")
  drugSchedule       String       @default("SCHEDULE_H") @map("drug_schedule")
  dispensedAt        DateTime     @default(now()) @map("dispensed_at")
  createdAt          DateTime     @default(now()) @map("created_at")

  salesInvoice       SalesInvoice @relation(fields: [salesInvoiceId], references: [id], onDelete: Cascade)

  @@index([doctorName])
  @@index([patientName])
  @@index([dispensedAt])
  @@map("prescription_records")
}

model PurchaseOrder {
  id                   String              @id @default(uuid())
  poNumber             String              @unique @map("po_number")
  supplierId           String              @map("supplier_id")
  branchId             String              @map("branch_id")
  status               String              @default("DRAFT") // DRAFT, SENT, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED
  expectedDeliveryDate DateTime?           @map("expected_delivery_date")
  subtotal             Float               @default(0)
  taxAmount            Float               @default(0) @map("tax_amount")
  totalAmount          Float               @default(0) @map("total_amount")
  notes                String?
  convertedPurchaseId  String?             @map("converted_purchase_id")
  createdByUserId      String              @map("created_by_user_id")
  createdAt            DateTime            @default(now()) @map("created_at")
  updatedAt            DateTime            @updatedAt @map("updated_at")

  supplier             Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  branch               Branch              @relation(fields: [branchId], references: [id], onDelete: Restrict)
  createdByUser        User                @relation("POCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)
  items                PurchaseOrderItem[]
  invoices             PurchaseInvoice[]

  @@index([poNumber])
  @@index([status])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              String        @id @default(uuid())
  purchaseOrderId String        @map("purchase_order_id")
  medicineId      String        @map("medicine_id")
  orderedQty      Int           @map("ordered_qty")
  receivedQty     Int           @default(0) @map("received_qty")
  unitId          String?       @map("unit_id")
  expectedRate    Float         @map("expected_rate")
  taxPercent      Float         @default(0) @map("tax_percent")
  lineTotal       Float         @map("line_total")

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  medicine        Medicine      @relation(fields: [medicineId], references: [id], onDelete: Restrict)

  @@map("purchase_order_items")
}
`;
  schema += newModels;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Successfully updated schema.prisma');
