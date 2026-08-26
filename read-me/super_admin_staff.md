# 👨‍💼 Module Documentation: Staff Directory & Granular RBAC (`/super-admin/staff`)

---

## 🎯 1. Overview & Business Purpose
The **Staff Directory & RBAC** module manages pharmacy employees, cashiers, pharmacists, store managers, and admins. It provides granular **Role-Based Access Control (RBAC)** to restrict unauthorized access to pricing overrides, shift reconciliations, inventory adjustments, and reports.

---

## 🛡️ 2. Roles & Permissions Hierarchy

| Role | Operations / POS | Inventory & Purchases | Expenses | Reports & P&L | Super Admin & Settings |
|---|---|---|---|---|---|
| **`CASHIER`** | ✅ Create Sale, Shift Close | ❌ View Only | ❌ View Only | ❌ Blocked | ❌ Blocked |
| **`PHARMACIST`** | ✅ Create Sale, Rx Entry | ✅ Receive Purchase, Batch Adjust | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`STORE_MANAGER`** | ✅ All POS & Returns | ✅ All Inventory & Transfers | ✅ Create Expense | ✅ View Sales Reports | ❌ Blocked |
| **`ADMIN / OWNER`** | ✅ Unrestricted | ✅ Unrestricted | ✅ Unrestricted | ✅ Full P&L & GST | ✅ Full Super Admin |

---

## 📡 3. Backend Endpoints & Database Tables

* `GET /api/staff`: List employees with assigned branches and roles.
* `POST /api/staff`: Create new employee account with encrypted password (bcrypt).
* `PUT /api/staff/:id/roles`: Update permissions.
* **Prisma Models**: `User`, `Role`, `UserRole`, `Branch`.
