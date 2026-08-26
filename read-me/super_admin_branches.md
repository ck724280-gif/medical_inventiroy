# 🌿 Module Documentation: Branch Management (`/super-admin/branches`)

---

## 🎯 1. Overview & Business Purpose
The **Branch Management** module allows Super Admins to manage multiple store branches, assign unique branch codes (e.g. `MAIN-01`, `BR-02`), configure separate invoice numbering sequences, and manage branch addresses and phone numbers.

---

## 🏬 2. Key Capabilities & Safety Controls

1. **Branch Creation**:
   - Branch Name, Branch Code (`MAIN-01`, `CITY-02`), Address, City, State, Phone, Email.
   - Dedicated `invoicePrefix` (e.g., `MAIN-` or `NORTH-`).
2. **Main Branch Deletion Protection**:
   - The primary store branch (`isMain: true` or code `MAIN-01`) is **permanently protected against accidental deletion** in both frontend UI and backend API.
3. **Multi-Tenant Branch Data Isolation**:
   - Each inventory batch, cashier shift, expense voucher, and sales invoice is linked strictly to its respective `branchId`.

---

## 📡 3. Backend Endpoints & Database Tables

* `GET /api/branches`: Lists all store branches.
* `POST /api/branches`: Create new branch.
* `PUT /api/branches/:id`: Update branch metadata.
* `DELETE /api/branches/:id`: Delete secondary branch (blocked for Main Branch).
* **Prisma Model**: `Branch` (`name`, `code`, `address`, `isMain`, `isActive`).
