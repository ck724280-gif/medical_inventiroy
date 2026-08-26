# 🏗️ Technical Architecture & Database Schema Guide

---

## 🎯 1. Monorepo Architecture Overview

The system is structured as a high-performance **Turborepo Monorepo**:

```text
├── apps/
│   ├── api/                 # NestJS 10 REST & WebSocket API Server
│   └── web/                 # Next.js 14 (App Router) Frontend Application
├── packages/
│   ├── shared-types/        # TypeScript DTOs, Enums & Interfaces
│   ├── shared-utils/        # Business Logic, FEFO, GST, Round-Off, Currencies
│   ├── constants/           # Global Roles, Permissions & Schedules
│   └── validation/          # Zod & class-validator Schemas
├── prisma/
│   └── schema.prisma        # Master PostgreSQL Database Schema
└── read-me/                 # Exhaustive Operational & Technical Documentation
```

---

## 🗄️ 2. Core Prisma Database Models & Relations

### Key Database Models:
1. **`Branch`**: Multi-tenant scoping container (`id`, `name`, `code`, `isMain`).
2. **`User` & `Role`**: Authentication & RBAC permissions.
3. **`Medicine` & `Batch`**: Master drugs and individual expiry batches (`currentQty`, `mrp`, `sellingPrice`, `purchasePrice`, `expiryDate`).
4. **`SalesInvoice` & `SalesItem` & `SalesPayment`**: Completed POS transactions with `shiftId`.
5. **`CashierShift`**: Drawer float tracking (`openingCash`, `closingCash`, `expectedCash`, `cashDifference`).
6. **`Expense`**: Operating and petty cash overheads (`amount`, `paymentMethod`, `date`).
7. **`Purchase` & `PurchaseItem`**: Inward distributor bills.
8. **`SalesReturn` & `SalesReturnItem`**: Customer return authorizations.
9. **`StockTransfer` & `StockTransferItem`**: Inter-branch movements.

---

## 🔐 3. Security, Authentication & Multi-Tenancy

* **Password Security**: Salted `bcrypt` password hashing (10 rounds).
* **JWT Access & Refresh Tokens**: Dual-token architecture with HTTP-only cookies and Authorization headers.
* **Prisma Middleware Scoping**: Ensures every sensitive query filters by `branchId` to prevent cross-store data leakage.
* **Shift Isolation**: Invoices and cash ledger movements are linked directly to `shiftId` for tamper-proof auditing.
