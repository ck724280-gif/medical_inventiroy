# 🛒 Module Documentation: High-Speed POS Billing (`/pos`)

---

## 🎯 1. Overview & Business Purpose
The **Point of Sale (POS)** module is built for lightning-fast billing in busy medical stores. It supports full keyboard navigation (F2–F10), barcode scanning, Schedule H prescription alerts, multi-split payments, automated Round-Off (Floor ₹33), and instant 58mm/80mm thermal & A4/A5 GST invoice generation.

---

## ⌨️ 2. Keyboard Shortcuts & Workflow

| Shortcut | Action | Description |
|---|---|---|
| **`F2`** | Search Medicine | Focuses medicine search input box immediately |
| **`F3`** | Switch Batch / Expiry | Opens FEFO batch selection modal |
| **`F4`** | Customer Selector | Search patient by Mobile No or Name |
| **`F7`** | Multi-Payment Split | Opens split payment modal (Cash + UPI + Card + Credit) |
| **`F8`** | Apply Invoice Discount | Opens % discount input |
| **`F9`** | Complete Checkout & Bill | Validates shift, creates sale, opens print preview |
| **`F10`** | Clear Cart | Resets cart state for next walk-in customer |
| **`Ctrl+J`** | AI Co-Pilot | Opens floating assistant |
| **`Up / Down`** | Navigate Cart Items | Selects items in billing table |
| **`+ / -`** | Adjust Quantity | Increases or decreases quantity of selected item |

---

## ⚡ 3. Key POS Features

### A. Barcode & Instant Search
* Typing or scanning a barcode immediately searches and loads the medicine.
* If a medicine has multiple batches, the **FEFO (First-Expiry-First-Out)** batch is pre-selected automatically.

### B. Unit Packaging Conversion (Box / Strip / Tablet)
* Pharmacists can sell by **Tablet**, **Strip**, or **Box**.
* Unit pricing dynamically recalculates:
  $$\text{Strip Rate} = \text{Tablet Rate} \times \text{Tablets Per Strip}$$
  $$\text{Box Rate} = \text{Strip Rate} \times \text{Strips Per Box}$$

### C. Schedule H / H1 / X Prescription Guard
* If an item is Schedule H or H1, attempting to checkout triggers the **Schedule H Prescription Modal**.
* Requires Doctor Name & Registration No for regulatory compliance.

### D. Automated Round-Off System
* **Down (₹33)** *(Default)*: Always rounds down paise ($₹33.67 \rightarrow ₹33.00$, $₹33.34 \rightarrow ₹33.00$).
* **Nearest**: $0.50+$ rounds up, else down.
* **Exact**: Keeps exact paise ($₹33.67$).

### E. Split Payment Support
* Combine Cash, UPI, Card, and Customer Credit (Khata) in a single bill.

---

## 🖨️ 4. Thermal & A4/A5 Print Layouts
* **58mm Thermal**: Compact 2-inch roll printer layout with barcode.
* **80mm Thermal**: 3-inch roll printer layout with detailed tax breakdown.
* **A4 / A5 GST Tax Invoice**: Full institutional invoice format with Store Logo, DL No, GSTIN, and Bank QR.

---

## 📡 5. Backend Endpoints & Database Tables

* `POST /api/pos/checkout`: Creates `SalesInvoice`, `SalesItem`, `SalesPayment`, decrements `Batch.currentQty`, logs `StockMovement`.
* `GET /api/sales/:id/receipt`: Generates print receipt DTO.
