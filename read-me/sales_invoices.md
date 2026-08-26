# 🧾 Module Documentation: Sales & Invoices (`/sales`)

---

## 🎯 1. Overview & Business Purpose
The **Sales & Invoices** module is the master historical sales ledger. It allows pharmacists, managers, and accountants to audit past bills, search by invoice number, customer phone, or date range, check payment statuses, reprint receipts, and download PDF tax invoices.

---

## 🔍 2. Features & User Interface

1. **Global Search & Filter Bar**:
   - Filter by: Invoice Number (e.g. `INV-000124`), Customer Name/Mobile, Payment Mode (Cash, UPI, Card, Credit), Payment Status (PAID, PARTIAL, DUE), Date Range.
2. **Sales Ledger Table**:
   - Displays Invoice No, Date & Time, Customer Name, Items Count, Subtotal, Discount, Tax, Round-Off, Net Total, Paid Amount, and Cashier Name.
3. **Actions Menu**:
   - **View Details**: Full line-item breakdown with batch numbers and tax split.
   - **Reprint Receipt**: Re-opens the thermal/A4 receipt modal with `[REPRINT]` watermark.
   - **PDF Download**: Downloads GST-compliant PDF invoice.
   - **Return Sale**: Navigates directly to Sales Return authorization.
   - **Cancel / Delete Invoice (Admin only)**: Reverses stock and logs cancellation audit.

---

## 🧮 3. Payment Statuses & Balance Tracking

* **PAID**: $\text{Paid Amount} \ge \text{Total Amount}$
* **PARTIAL**: $0 < \text{Paid Amount} < \text{Total Amount}$
* **UNPAID / CREDIT**: $\text{Paid Amount} = 0$, balance added to Customer Credit Ledger.

---

## 📡 4. Backend Endpoints & Database Tables

* `GET /api/sales`: Retrieves paginated invoices with branch isolation.
* `GET /api/sales/:id`: Detailed invoice view with items, batches, and payments.
* `DELETE /api/sales/:id`: Admin cancellation (atomically restocks batches).
* **Prisma Models**: `SalesInvoice`, `SalesItem`, `SalesPayment`, `CustomerCredit`.
