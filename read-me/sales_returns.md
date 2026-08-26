# 🔄 Module Documentation: Sales Returns & Refunds (`/sales-returns`)

---

## 🎯 1. Overview & Business Purpose
The **Sales Returns** module handles patient and customer medicine returns. It supports partial and full invoice returns, stock condition categorization (Resalable, Damaged, Expired), and refund mode management (Cash Drawer deduction vs UPI/Credit refund).

---

## ⚙️ 2. Step-by-Step Return Process

1. **Invoice Lookup**:
   - Enter Original Invoice Number (e.g. `INV-000105`) or search by customer.
2. **Item & Quantity Selection**:
   - Select the specific items being returned.
   - Enter return quantity (cannot exceed sold quantity).
3. **Restock Condition Assessment**:
   - **`RESALABLE`**: Good condition $\rightarrow$ Automatically added back to active `Batch.currentQty`.
   - **`DAMAGED`**: Broken/seal-opened $\rightarrow$ Added to `Batch.damagedQty` (quarantined, not sold in POS).
   - **`EXPIRED`**: Expired item $\rightarrow$ Added to `Batch.expiredQty` for supplier return claim.
4. **Refund Mode Execution**:
   - **CASH**: Deducted from the active cashier shift's expected drawer cash.
   - **UPI**: Refunded digitally via bank; does not impact cash drawer.
   - **CREDIT**: Subtracted from customer's outstanding balance.

---

## 🧮 3. Financial & Inventory Movement Formulas

$$\text{Refund Amount} = \sum (\text{Returned Item Rate} \times \text{Return Qty}) - \text{Proportional Discount}$$

$$\text{Updated Batch Qty (If Resalable)} = \text{Current Qty} + \text{Return Qty}$$

---

## 📡 4. Backend Endpoints & Database Tables

* `POST /api/sales/returns`: Creates `SalesReturn`, logs `SalesReturnItem`, updates `Batch` quantities, logs `StockMovement` (`direction: IN`, `type: SALES_RETURN`).
* `GET /api/sales/returns`: Paginated return ledger.
* **Prisma Models**: `SalesReturn`, `SalesReturnItem`, `StockMovement`.
