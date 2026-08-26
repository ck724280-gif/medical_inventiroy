# 🔄 Module Documentation: Inter-Branch Stock Transfers (`/stock-transfers`)

---

## 🎯 1. Overview & Business Purpose
The **Stock Transfers** module facilitates seamless stock movement between different pharmacy branches in a multi-location chain (e.g., Main Dispensary `MAIN-01` $\rightarrow$ Branch 2 `BR-02`). It tracks dispatch, in-transit custody, receiving, and automatic destination batch creation.

---

## 🚚 2. Inter-Branch Transfer Stages

1. **Transfer Request (Requisition)**:
   - Destination branch requests stock or Main Warehouse dispatches surplus medicines.
2. **Dispatch & Outward In-Transit**:
   - Source branch selects specific batches and quantities.
   - Stock is immediately deducted from source `Batch.currentQty` and logged as `IN_TRANSIT`.
   - Transfer Delivery Challan is printed.
3. **Receiving & Inward Acceptance**:
   - Destination branch receives package, verifies physical quantities & batch numbers, and clicks **"Accept Transfer"**.
   - System automatically creates or increments the batch in the destination branch database.

---

## 🛡️ 3. Multi-Branch Isolation Safeguards
* Batches are strictly scoped by `branchId`.
* Source branch cannot transfer more stock than its active `currentQty`.
* If batch already exists in destination branch with the same `(medicineId, branchId, batchNumber)`, quantities merge smoothly without duplicate entries.

---

## 📡 4. Backend Endpoints & Database Tables

* `POST /api/stock-transfers`: Initiates transfer request and dispatches stock.
* `POST /api/stock-transfers/:id/receive`: Confirms receipt at destination branch.
* **Prisma Models**: `StockTransfer`, `StockTransferItem`, `Batch`, `StockMovement`.
