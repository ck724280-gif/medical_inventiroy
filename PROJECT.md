# Project: MedCare Pharmacy ERP POS Full-Scale Live Testing & Deployment

## Architecture
- **Monorepo**: Turborepo / npm workspaces
  - `apps/api`: NestJS REST API with Prisma ORM, PostgreSQL database, JWT authentication with Argon2 password hashing, RBAC & Multi-tenant Branch context.
  - `apps/web`: Next.js 14 App Router, Tailwind CSS, Lucide icons, SWR/Fetch API client.
- **Production Backend**: `https://medical-inventiroy.onrender.com`
- **Deploy Webhook**: `POST https://api.render.com/deploy/srv-da2n9agn74is738bcj7g?key=l27JyWqYM6M`
- **Active Branches**:
  - Main Dispensary Branch (MAIN-01): `e80d4452-8497-4c34-aaf0-184fc3700146`
  - GEWERYE (BR-02): `eebc8329-3b2f-465a-a65e-7bca109bcd44`
  - raghu (VG-KDJ): `546119c8-cbfd-4e47-a638-a2e249471e2a`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Operations Simulation (R2) | Verify & simulate Sales, POs, PIs, Low-stock trigger in BR-02, Shifts, Expenses, Returns across 3 branches | R2 | ORIGINAL_REQUEST §1 |
| 2 | Sidebar Route Audit (R3) | Audit all 18 sidebar routes against live backend API with Super Admin token | R3 | ORIGINAL_REQUEST §2 |
| 3 | Sales Returns Route Fix (R4) | Add missing `GET /sales/by-invoice/:invoiceNumber` endpoint in `SalesController` & `SalesService` | R4 | Survey 1, 3 |
| 4 | Build & Integrity Verification (R4) | Monorepo `npm run build` verification with 0 errors | R4 | ORIGINAL_REQUEST §3 |
| 5 | Git Commit, Push & Webhook (R4) | Commit fixes, push to origin main, trigger Render deploy webhook | R4 | ORIGINAL_REQUEST §3 |
| 6 | Comprehensive Test Report (R5) | Generate `docs/test_report.md` with route table, entity counts, bug log, commit hash | R5 | ORIGINAL_REQUEST §4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| R2 | Operations Simulation Verification | Verify all live entity counts & run delta simulation if needed | none | DONE |
| R3 | Sidebar Route Live Audit | Execute automated live HTTP audit of all 18 sidebar routes and their API endpoints | R2 | IN_PROGRESS |
| R4 | Diagnose, Fix & Deploy | Fix `GET /sales/by-invoice/:invoiceNumber`, verify builds, git commit, push, trigger webhook | R3 | PLANNED |
| R5 | Final Test Report | Generate complete `docs/test_report.md` documentation | R4 | PLANNED |

## Interface Contracts
### Web App ↔ API
- `GET /api/sales/by-invoice/:invoiceNumber`
  - Request: `invoiceNumber: string` (e.g., `INV-MAIN-01-2026-00001`)
  - Response: `Sale` object with `items: SaleItem[]`, `customer`, `payments: Payment[]`
- `POST /api/sales-returns`
  - Request: `{ originalSaleId, branchId, reason, refundMode, items: [{ saleItemId, batchId, quantity, returnPrice, restockable, condition }] }`
  - Response: `SalesReturn` object with restocked batch inventory updates.

## Code Layout
- `apps/api/src/modules/sales/sales.controller.ts` — Sales API endpoints
- `apps/api/src/modules/sales/sales.service.ts` — Sales business logic & invoice lookup
- `apps/web/src/app/sales-returns/page.tsx` — Sales returns frontend UI
- `docs/test_report.md` — Final deliverables report
