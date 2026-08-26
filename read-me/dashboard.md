# 📊 Module Documentation: Central Command Dashboard (`/`)

---

## 🎯 1. Overview & Business Purpose
The **Central Command Dashboard** is the executive mission control for the pharmacy. It aggregates live business metrics from sales, inventory, cash flow, and supplier debts across the selected active branch or whole organization.

---

## 🖥️ 2. User Interface & Key Components

1. **Active Branch Header & Switcher**:
   - Displays current branch code (e.g. `MAIN-01 · Main Dispensary Branch`).
   - Clicking allows Super Admins to switch live store context without relogging.
2. **Top Metric Cards (KPIs)**:
   - **Today's Gross Sales**: Total invoice revenue generated today with count of bills.
   - **Today's Net Profit & Margin**: Calculated in real-time ($(\text{Selling Price} - \text{Purchase Price}) - \text{Discounts}$).
   - **Live Drawer Cash**: Current physical cash available in open cashier shift.
   - **Low Stock Warnings**: Items below safety threshold.
   - **Expiring Batches (Next 30/60/90 Days)**: Critical FEFO radar.
3. **Interactive Charts**:
   - 7-Day & 30-Day Revenue Trend (Hourly & Daily velocity).
   - Category Breakdown (Antibiotics, Analgesics, Cardiac, OTC).
4. **Fast Action Tiles (Quick Launchers)**:
   - `[F9] Open Fast POS Billing`
   - `[Alt+S] Receive Purchase Inward`
   - `[Alt+M] Add New Medicine`
   - `[Alt+R] Open Cashier Shift Register`
5. **FEFO Expiry Alert Table**:
   - Lists batches nearing expiry with batch number, shelf life, and remaining quantity for clearance discounts.

---

## 🧮 3. Mathematical Logic & Calculations

### Today's Net Profit Calculation:
$$\text{Today Net Profit} = \sum_{i=1}^{n} \left( (\text{Line Rate}_i - \text{Batch Purchase Price}_i) \times \text{Qty}_i \right) - \text{Invoice Discounts} - \text{Today Cash Expenses}$$

### Gross Profit Margin (%):
$$\text{Profit Margin \%} = \left( \frac{\text{Today Net Profit}}{\text{Today Gross Sales}} \right) \times 100$$

---

## 📡 4. Backend Endpoints & Data Flow

* `GET /api/reports/dashboard-summary?branchId=:branchId`:
  - Returns today's sales, yesterday's comparison %, active inventory valuation, critical stock alerts, and expiring batches.
* `GET /api/pos/current-shift`:
  - Returns status of open drawer shift, float, and current running totals.

---

## 🛡️ 5. Edge Cases & Error Handling
* If a new branch has 0 sales, numbers safely display `₹0.00` without `NaN` or division by zero errors.
* Unauthenticated users are redirected to `/login`.
