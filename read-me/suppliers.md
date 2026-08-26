# 🏢 Module Documentation: Suppliers & Distributors (`/suppliers`)

---

## 🎯 1. Overview & Business Purpose
The **Suppliers** module manages pharmaceutical distributors, stockists, and drug manufacturing vendors. It tracks vendor contact details, Drug License numbers (Form 20B/21B), GSTIN, purchase bills, payment vouchers, and outstanding accounts payable.

---

## 📑 2. Features & Ledger Audit

1. **Vendor Compliance Details**:
   - Company Name, Contact Person, Phone, Email, Office Address.
   - **Drug License Numbers** (Mandatory for pharmaceutical compliance).
   - **GSTIN** (For input tax credit validation).
2. **Accounts Payable Ledger**:
   - Total Inward Purchases vs Payments Made vs Outstanding Payables.
3. **Supplier Payment Vouchers**:
   - Record payments made to distributor via Bank NEFT/RTGS, Cheque, or Cash.
4. **Purchase Bills History**:
   - View all past GRNs and invoices received from this vendor.

---

## 📡 3. Backend Endpoints & Database Tables

* `GET /api/suppliers`: Search and list all active suppliers.
* `POST /api/suppliers`: Create vendor profile.
* `POST /api/suppliers/:id/payments`: Record supplier payment voucher.
* **Prisma Models**: `Supplier`, `Purchase`, `SupplierPayment`.
