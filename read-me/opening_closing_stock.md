# 📥 Module Documentation: Opening/Closing Stock & Bulk Import (`/import`)

---

## 🎯 1. Overview & Business Purpose
The **Opening / Closing Stock & Bulk Import** module allows pharmacies migrating from legacy software or setting up new store branches to bulk-import thousands of medicines, initial inventory batches, opening balances, and suppliers in seconds using standard Excel/CSV templates.

---

## 📊 2. Bulk Import Capabilities

1. **Excel & CSV File Parsing**:
   - Drag & drop `.xlsx` or `.csv` files.
   - Built-in validation checks for missing fields, invalid expiry dates, and negative rates.
2. **Column Mapping Schema**:
   - Medicine Name, Generic Name, Category, HSN Code.
   - Batch Number, Expiry Date (`YYYY-MM-DD` or `MM/YY`).
   - MRP, Purchase Price, Selling Price, Tax % (GST).
   - Opening Quantity, Strips Per Box, Tablets Per Strip.
3. **Dry-Run Preview & Error Highlighting**:
   - System displays a pre-import grid highlighting duplicate batch numbers or unparseable dates in red before committing to the database.

---

## 📡 3. Backend Endpoints & Database Tables

* `POST /api/inventory/import`: Accepts multipart form data, validates rows, executes transactional Prisma batch inserts.
* **Prisma Models**: `Medicine`, `Batch`, `StockMovement` (`type: OPENING_STOCK`).
