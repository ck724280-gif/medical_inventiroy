# Original User Request

## 2026-08-19T01:41:46Z

Build a complete, production-ready, single-business (100% white-label configurable, non-multi-tenant SaaS) multi-branch Medical Inventory & Pharmacy ERP / POS System covering all 70 specification sections and 47 implementation phases from the master architecture prompt.

Working directory: d:/antigravity programme/medical_inventory
Integrity mode: development

## Requirements

### R1. Complete Monorepo & Shared Core Layer
Build the complete Turborepo / npm workspaces monorepo containing:
- `packages/shared-types`: Full TypeScript domain models (38+ entities), DTOs, and system enums.
- `packages/constants`: Complete 40+ granular RBAC permissions matrix, 7 default roles, GST tax slabs.
- `packages/shared-utils`: FEFO batch allocation engine, currency precision math, invoice sequencers, GS1 barcode parser.
- `packages/validation`: Comprehensive Zod schemas for all domain entities and endpoints.

### R2. Relational Database Schema & Seed Engine
- Define normalized Prisma schema (`prisma/schema.prisma`) with 38+ models covering Identity/RBAC, White-Label Business Profiles, Multi-Branch Settings, Medicine Master, Batch Inventory, Stock Movements, Adjustments, Transfers, Inward Purchases, POS Sales Invoices, Split Payments, Returns, Expenses, Audit Logs, and Receipt/Invoice Templates.
- Automated seed script (`prisma/seed/index.ts`) seeding all default permissions, roles, business settings, super admin (`admin@medcare.com` / `Admin@123456`), and standard pharmaceutical inventory.

### R3. Backend REST API (`apps/api` — NestJS 10)
- Security & Infrastructure: Argon2 password hashing, JWT access + rotating refresh tokens, rate-limiting lockout, global audit interceptor, and exception filters.
- 20+ Domain Modules: `auth`, `users`, `roles`, `settings`, `branches`, `categories`, `manufacturers`, `units`, `medicines`, `suppliers`, `customers`, `batches`, `inventory`, `purchases`, `sales`, `pos`, `sales-returns`, `purchase-returns`, `printing`, `invoices`, `expenses`, `financials`, `reports`, `dashboard`, `audit`, `notifications`, `backup`, `import-export`.
- OpenAPI / Swagger documentation at `/docs`.

### R4. Web ERP & POS Billing Terminal (`apps/web` — Next.js 14 App Router)
- High-Speed Desktop POS Counter (`/pos`) with barcode scanner quick-input, F1/F2/F9 shortcuts, FEFO batch allocation, split payments (Cash, UPI, Card), hold/resume carts, and 58mm/80mm ESC/POS thermal receipt preview.
- Dynamic Theme & White-Label propagation from database settings.
- Interactive 3D spatial medical widget (Three.js / React Three Fiber).
- Complete operational pages for Dashboard, Medicines, Inventory/Batches, Expiry Dashboard (5 brackets), Purchases, Sales Invoices, Returns, Suppliers, Customers, Expenses, Financial Reports, and Opening Stock Wizard.

### R5. Mobile POS & Barcode Scanner (`apps/mobile` — Expo / React Native)
- Mobile billing terminal with live camera barcode scanning, FEFO cart management, and Bluetooth thermal printer integration hooks.

---

## Acceptance Criteria

### Automated Compilation & Build
- [ ] Monorepo passes typecheck with 0 errors across all packages and apps (`npm run build`).
- [ ] Database schema synchronizes cleanly via Prisma (`npx prisma db push`).
- [ ] Database seed completes without errors (`npm run db:seed`).

### Business Logic & Integrity Guardrails
- [ ] FEFO dispensation strictly allocates earliest-expiring active batches first (`expiryDate: 'asc'`).
- [ ] Expired batches (`expiryDate <= NOW`) or inactive batches are strictly blocked from sale.
- [ ] All stock deductions and return increments execute atomically inside database transactions (`$transaction`).
- [ ] Gross profit is calculated accurately from actual sold batch purchase costs (`SellingPrice - BatchPurchasePrice`).
- [ ] Thermal receipt formatting outputs valid monospace 58mm / 80mm ESC/POS compatible text.
