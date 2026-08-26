# ☕ Module Documentation: Expenses & Petty Cash (`/expenses`)

---

## 🎯 1. Overview & Business Purpose
The **Expenses** module tracks daily pharmacy operational and petty cash overheads. Expenses paid in cash during an active cashier shift automatically deduct from the cashier's expected drawer cash to ensure 100% accurate shift reconciliation.

---

## 🏷️ 2. Expense Categories & Payment Methods

### A. Pre-Configured Expense Categories
* **`TEA_SNACKS_HOSPITALITY`**: Staff refreshments and hospitality.
* **`COURIER_SHIPPING`**: Medicine delivery & parcel transport fees.
* **`ELECTRICITY_POWER`**: Store electricity and backup generator diesel.
* **`STORE_RENT`**: Shop rent.
* **`SALARY_WAGES`**: Daily wages & staff advances.
* **`CLEANING_MAINTENANCE`**: Housekeeping, sanitizer, AC service.
* **`MISCELLANEOUS`**: Other store operational expenses.

### B. Payment Modes & Cash Drawer Impact
* **`CASH`**: Paid out of the physical cash register. $\rightarrow$ **Deducts from active Cashier Shift Float.**
* **`UPI / BANK_TRANSFER`**: Paid digitally from pharmacy bank account. $\rightarrow$ **Does NOT affect drawer cash.**

---

## 📡 3. Backend Endpoints & Database Tables

* `GET /api/expenses`: Paginated expense ledger with category and date filters.
* `POST /api/expenses`: Record expense entry with `branchId`, `createdByUserId`, and `date`.
* **Prisma Model**: `Expense` (`category`, `amount`, `paymentMethod`, `notes`, `date`, `branchId`, `createdByUserId`).
