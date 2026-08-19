# MedCare — Advanced Medical Inventory & Pharmacy ERP / POS System

Production-grade, single-business (100% white-label configurable, non-multi-tenant SaaS), multi-branch ready Medical Inventory & Pharmacy ERP/POS system built to the master specification.

---

## 🌟 Core Architectural Features

### 1. Business & Single-Tenant White-Label Architecture
- **Single Medical Business Focus**: Purpose-built for independent pharmacies and hospital healthcare retail stores. No tenant IDs or complex tenant switching.
- **Dynamic White-Labeling**: Store name, address, phone, GSTIN, pharmacy drug license, logos, and UI theme colors (`--color-primary`, `--color-secondary`) are dynamically loaded from database settings (`/api/settings/public`).

### 2. Batch Inventory & FEFO Engine
- **First Expiry, First Out (FEFO)**: When billing or dispensing medicines, the system automatically allocates from the earliest-expiring active batch.
- **Expiry Protection**: Expired batches are strictly blocked from sale.
- **Expiry Dashboard**: Real-time bracket classification for Expired, Expiring in 7 Days, Expiring in 30 Days, Expiring in 60 Days, and Expiring in 90 Days.
- **Stock Movement Ledger**: Immutable ledger tracking every stock change (`PURCHASE`, `SALE`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `SALES_RETURN`, `PURCHASE_RETURN`, `OPENING_STOCK`).

### 3. High-Speed POS Billing & Thermal Printing
- **Desktop-First Keyboard Workflow**: Dedicated keyboard shortcuts (F1 Barcode Scan, F2 Medicine Search, F9 Checkout).
- **Default Thermal Output**: Optimized 58mm and 80mm ESC/POS compatible thermal receipt output prioritized alongside A4 tax invoices and PDFKit PDF bills.
- **Payment Flexibility**: Cash, UPI/QR, Card, Bank Transfer, and Split Payments.
- **Hold & Resume Bills**: Suspend active customer carts and resume instantly.

### 4. Purchasing & Receiving Workflows
- **Draft -> Confirm Lifecycle**: Inward stock is only added to live inventory upon explicit confirmation.
- **Batch Details Verification**: Captures batch numbers, manufacturing dates, expiry dates, supplier purchase prices, MRP, and selling rates.
- **Supplier Ledger**: Outstanding payable balances update transactionally.

### 5. Sales & Purchase Returns
- **Condition Routing**: Returns evaluated as `RESALABLE` (restores live stock), `DAMAGED` (increments damaged stock), or `EXPIRED` (increments expired stock).
- **Immutable Audit**: Records bidirectional stock movements and updates financial balances.

### 6. Accurate Financials & Real-Time Analytics
- **Cost of Goods Sold (COGS)**: Gross profit computed from actual sold item batch purchase costs (`SellingPrice - BatchPurchasePrice`).
- **Net Profit Estimates**: Computes `GrossProfit - TotalExpenses`.
- **Exporting**: Excel (`.xlsx`) and PDF generation for all inventory valuations and sales reports.

### 7. 3D Spatial Experience
- **Interactive 3D Web Elements**: Floating medical capsule canvas rendered using Three.js / React Three Fiber pursuant to the `3d-web-experience` design standard.

### 8. Cross-Platform Mobile Application
- **Expo / React Native App**: Mobile billing counter with live barcode camera scanning and Bluetooth thermal printer hooks.

---

## 📁 Monorepo Layout

```
medical_inventory/
├── apps/
│   ├── api/          # NestJS Backend REST API (20+ feature domains)
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

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: `v20+` or `v24+`
- **PostgreSQL**: PostgreSQL 14+ instance running locally or via Docker
- **npm** or **pnpm**

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medcare_db?schema=public"
JWT_ACCESS_SECRET="your-jwt-access-secret-key-at-least-32-chars-long"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-at-least-32-chars-long"
```

### 3. Database Migration & Seed
```bash
# Generate Prisma Client
npx prisma generate

# Apply Schema Migrations
npx prisma migrate dev --name init

# Run Seed Scripts
npm run seed
```

**Default Admin Credentials**:
- **Email**: `admin@medcare.com`
- **Password**: `Admin@123456`

### 4. Running the System

```bash
# Run NestJS Backend API (Port 4000)
npm run dev:api

# Run Next.js Web POS & Admin Portal (Port 3000)
npm run dev:web

# Run Expo Mobile App (Optional)
npm run dev:mobile
```

- **Web Dashboard & POS**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🔒 Default Role Permissions Matrix

| Module | OWNER | ADMIN | MANAGER | PHARMACIST | CASHIER | INVENTORY |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| POS Billing (`sale.create`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Discount Overrides (`sale.discount`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Medicine Catalog (`medicine.view`)| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Medicines (`medicine.create`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory Adjustments (`inventory.adjust`)| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Inward Purchases (`purchase.create`) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Financial Reports (`report.view`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| White-Label Settings (`settings.manage`)| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
