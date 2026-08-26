# 🏛️ Module Documentation: Super Admin Control Center (`/super-admin`)

---

## 🎯 1. Overview & Business Purpose
The **Super Admin Control Center** is the central governance dashboard for pharmacy chain owners and directors. It provides enterprise-wide visibility across all branches, aggregate sales performance, system health, and role management.

---

## 📊 2. Enterprise Features

1. **Multi-Branch Aggregate Revenue**:
   - Total sales across all branches today, this month, and this fiscal year.
2. **Branch Performance Comparison**:
   - Side-by-side comparison of revenue, bills count, inventory turnover, and profit margins per branch.
3. **Global Action Triggers**:
   - Manage Branches, Add/Deactivate Staff, Global Inventory Re-sync, and System Health diagnostics.

---

## 🛡️ 3. Role-Based Access Control (RBAC) Security
* Accessible strictly to users with `OWNER` or `ADMIN` roles.
* Non-admin users attempting to visit `/super-admin` are safely blocked with a 403 Forbidden alert.
