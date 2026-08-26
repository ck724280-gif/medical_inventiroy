# 👤 Module Documentation: Customers & Patient Directory (`/customers`)

---

## 🎯 1. Overview & Business Purpose
The **Customers & Patient Directory** manages regular pharmacy clients, chronic medication patients, institutional B2B buyers, and credit accounts (Khata / Udhar). It tracks purchase history, outstanding balances, credit limits, and Schedule H prescription records.

---

## 📋 2. Core Features & Ledger Management

1. **Customer Profile & Identification**:
   - Patient Name, Mobile Number, Email, Address, GSTIN (for B2B billing).
2. **Credit Limit & Outstanding Balance (Khata)**:
   - Sets maximum allowed credit (e.g. ₹10,000).
   - In POS, selecting `CREDIT` payment mode increases customer's `currentBalance`.
   - POS automatically blocks credit sales if $\text{Balance} + \text{Sale Amount} > \text{Credit Limit}$ (unless approved by Super Admin).
3. **Customer Payment Receipts**:
   - Record customer repayments (Cash/UPI/Cheque) against their credit ledger.
4. **Prescription History Archival**:
   - Access all past Schedule H doctor prescriptions linked to this patient.

---

## 📡 3. Backend Endpoints & Database Tables

* `GET /api/customers`: Search by name or 10-digit mobile number.
* `POST /api/customers`: Add new patient record.
* `POST /api/customers/:id/payments`: Record ledger repayment.
* **Prisma Models**: `Customer`, `CustomerCredit`, `SalesInvoice`, `PrescriptionRecord`.
