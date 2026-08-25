# MedCare — Advanced Medical Inventory & Pharmacy ERP / POS System

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/ck724280-gif/medical_inventiroy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-blue)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)](https://tailwindcss.com/)

**MedCare** is a production-grade, single-business (100% white-label configurable, non-multi-tenant SaaS), multi-branch Medical Inventory & Pharmacy ERP/POS ecosystem built with high-velocity desktop and mobile workflows, strict FEFO drug dispensing, statutory compliance (GSTR-1, GSTR-3B, Schedule H/H1 registers), Cash Register shift management, and universal thermal/A4 printing.

---

## 🌟 Key Architecture & Feature Highlights

### 1. 🏢 Single Unified Database with Branch-Wise Isolation
- **One Shared Database**: Built on a single, high-performance PostgreSQL database for simplicity, centralized backups, and consolidated reporting.
- **Strict Data Partitioning via `branchId`**: Every operational entity (`SalesInvoice`, `PurchaseInvoice`, `Customer`, `Batch`, `StockMovement`, `Expense`, `CashRegisterShift`) is partitioned by branch.
- **Instant Branch Context Switching**: Owners and Super Admins can switch active store branch contexts on the fly from the top header or Control Center without logging out.

---

### 2. ⚡ High-Speed POS Billing & Cash Register Sessions
- **Cashier Register Shift Enforcement**: Cashiers must open a cash register session with initial opening cash. Physical cash in drawer is auto-calculated with manual editable reconciliation upon closing.
- **Desktop Keyboard Accelerators**: Complete POS operations operable without mouse (`F1` Scan, `F2` Search, `F9` Pay, `Ctrl+K` Universal ERP Search).
- **Payment Split Support**: Accept Cash, UPI/QR (with dynamic pharmacy UPI QR code), Card, Bank Transfer, and Credit ledger.
- **Hold & Resume Carts**: Park ongoing bills and retrieve them anytime.

---

### 3. 📦 Opening & Closing Stock Management (`/import`)
- **Dual Dedicated Tabs**:
  - **Opening Stock (Import & Bulk Grid)**: Drag & Drop CSV spreadsheet upload, copy-paste from Excel sheets, downloadable CSV sample templates, live editable matrix, real-time cost & MRP valuation calculators, and batch audit logs.
  - **Closing Stock (Live Valuation & Export)**: Live batch-wise inventory register with physical stock on shelf, purchase valuation, MRP value, and gross margin calculations.
- **Multi-Format Exports**: Export live stock anytime in **Microsoft Excel (.xlsx)**, **CSV (.csv)**, or **Print / Save as PDF** via formatted browser print styles.

---

### 4. 📊 Reports & Legal Analytics (`/reports`)
- **P&L Summary**: Live Gross Revenue, COGS (Cost of Goods Sold), Operating Expenses, and Net Profit margins.
- **Sales Ledger**: Chronological invoices ledger with subtotal, tax, discounts, customer info, and one-click Excel export.
- **Purchase Ledger**: Inward supply bills with vendor names, GSTIN, taxable subtotal, tax breakdown, and Excel export.
- **Inventory Valuation**: Live batch and medicine valuations with cost vs retail MRP margins.
- **GST Returns**: Automated GSTR-1 (B2B and B2C tables) and GSTR-3B monthly return summaries with Input Tax Credit (ITC) calculations.
- **HSN Code Summary**: HSN code-wise quantity, taxable value, and GST rate breakdowns.
- **Schedule H / H1 / X Controlled Drug Register**: Statutory register tracking Patient Name/Age, Prescribing Doctor & Reg #, Dispensed Drug, Batch, Expiry, and Quantity.

---

### 5. 🖨️ Universal Print System & 20+ Layouts
- **20+ Print Templates**: Thermal 58mm, Thermal 80mm, A4 Standard, A5 Compact, Minimalist, Classic Medical Rx, Luxury Modern, Dark Theme, and Barcode Label sheets.
- **Thermal Receipt Customizer**: Super Admins can toggle individual fields (Pharmacy Logo, Drug License #, GSTIN, Doctor details, Customer balance, HSN breakdown, Greetings, QR Code, Footer notes) with live interactive previews.

---

### 6. 💊 FEFO Expiry & Batch Inventory Engine
- **First Expiry, First Out (FEFO)**: Automatically suggests and dispenses batches with the earliest expiry date.
- **Expiry Protection**: Hard-blocks expired batches from being billed.
- **Stock Movement Ledger**: Immutable audit log of all stock changes (`PURCHASE`, `SALE`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `SALES_RETURN`, `PURCHASE_RETURN`, `OPENING_STOCK`).

---

## 📁 Monorepo Layout

```
medical_inventory/
├── apps/
│   ├── api/          # NestJS 10 Backend REST API (20+ feature modules)
│   ├── web/          # Next.js 14 App Router Web Client & POS Terminal
│   └── mobile/       # React Native / Expo Mobile POS & Barcode Scanner
├── packages/
│   ├── shared-types/ # TypeScript interfaces, DTOs & Domain Enums
│   ├── constants/    # RBAC Permissions, Default Roles, GST Slabs, Units
│   ├── shared-utils/ # FEFO allocator, Currency math, Date & Barcode parsers
│   └── validation/   # Zod input validation schemas
├── prisma/
│   ├── schema.prisma # 38+ Model PostgreSQL Database Schema
│   └── seed/         # Automated DB Seed Scripts (Roles, Admin, Products)
├── turbo.json        # Turborepo build pipeline
└── package.json      # Monorepo Workspace Configuration
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: `v20+` or `v24+`
- **PostgreSQL**: PostgreSQL 14+ database instance
- **npm** (or **pnpm**)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medcare_db?schema=public"

# Authentication Secrets
JWT_ACCESS_SECRET="your-jwt-access-secret-key-at-least-32-chars-long"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-at-least-32-chars-long"

# Ports & URLs
PORT=4000
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

### 3. Database Migration & Seed
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with default roles, admin user, and medicine categories
npm run seed
```

**Default Super Admin Credentials**:
- **Email**: `admin@medcare.com`
- **Password**: `Admin@123456`

### 4. Running Locally
```bash
# Start NestJS Backend API (Port 4000)
npm run dev:api

# Start Next.js Web Frontend (Port 3000)
npm run dev:web

# Or run all simultaneously with Turborepo
npm run dev
```

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation**: [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🔒 Default Role Permissions Matrix

| Module / Permission | SUPER ADMIN | BRANCH MANAGER | PHARMACIST | CASHIER | INVENTORY |
| :--- | :---: | :---: | :---: | :---: | :---: |
| POS Billing (`sale.create`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cash Register Shift (`sale.create`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Discount Overrides (`sale.discount`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Medicine Catalog (`medicine.view`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory & Batches (`inventory.view`) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Inward Purchases (`purchase.create`) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Opening / Closing Stock (`inventory.adjust`) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Reports & Analytics (`report.view`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Super Admin & Branches (`super_admin.access`) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚢 Deployment on Render / Cloud
1. **API Service**: Deploy `apps/api` as a Node.js Web Service on Render with `npm run build:api` and start command `node dist/apps/api/main.js`.
2. **Web Service**: Deploy `apps/web` on Vercel or Render with `npm run build:web` and `npm run start:web`.
3. Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `NEXT_PUBLIC_API_URL` in the cloud environment settings.

---

## 📄 License
This project is licensed under the MIT License.
