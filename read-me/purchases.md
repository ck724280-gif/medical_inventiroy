# 🚚 Module Documentation: Purchases & Goods Received Note (GRN) (`/purchases`)

---

## 🎯 1. Overview & Business Purpose
The **Purchases** module handles pharmaceutical inward stock from distributors and manufacturers. Creating a purchase bill automatically creates new inventory batches, updates purchase rates & MRP, calculates GST Input Tax Credit (ITC), and updates supplier credit ledgers.

---

## 📝 2. Purchase Inward Workflow

1. **Header Entry**:
   - Select Supplier (e.g. `Mankind Pharma Distributor`).
   - Enter Supplier Invoice Number (e.g. `INV-PUR-98214`).
   - Enter Invoice Date & Payment Due Date.
2. **Item & Batch Lines**:
   - Medicine Name $\rightarrow$ Batch Number $\rightarrow$ Expiry Date ($\text{MM/YY}$).
   - Received Quantity + Free / Scheme Quantity (e.g. $10 + 1$ Free).
   - Purchase Rate per unit, MRP, Trade Discount %, GST Rate (0%, 5%, 12%, 18%).
3. **Automated Batch & Inventory Creation**:
   - Creating the purchase automatically inserts or increments `Batch` stock in the selected branch.
4. **GST Input Tax Credit (ITC)**:
   - Tracks CGST, SGST, and IGST paid to distributors for tax filing (GSTR-2B reconciliation).

---

## 🧮 3. Purchase Cost & Landing Cost Formulas

$$\text{Effective Unit Cost} = \frac{(\text{Billed Qty} \times \text{Purchase Rate}) - \text{Trade Discount}}{\text{Billed Qty} + \text{Free Qty}}$$

$$\text{Gross Purchase Total} = \text{Taxable Amount} + \text{CGST} + \text{SGST} + \text{IGST}$$

---

## 📡 4. Backend Endpoints & Database Tables

* `POST /api/purchases`: Creates `Purchase`, `PurchaseItem`, inserts `Batch`, logs `StockMovement` (`direction: IN`, `type: PURCHASE`).
* `GET /api/purchases`: Paginated purchase history.
* `DELETE /api/purchases/:id`: Reverses stock inward.
* **Prisma Models**: `Purchase`, `PurchaseItem`, `Batch`, `Supplier`, `StockMovement`.
