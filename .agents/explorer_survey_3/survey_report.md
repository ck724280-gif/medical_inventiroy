# Comprehensive Survey Report 3: E2E Testing Framework, Build Pipeline, Database Sync, and Deployment Strategy

**Date**: 2026-08-19  
**Agent**: Explorer Survey 3 (`.agents/explorer_survey_3`)  
**Target Repository**: `https://github.com/ck724280-gif/medical_inventiroy` (`main` branch)  
**Database**: Neon PostgreSQL (`ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech`)

---

## Executive Summary

This survey provides a complete investigation into the end-to-end testing harness, monorepo build pipeline, database connectivity, deployment readiness, and the architectural design for the **4-Tier E2E Testing Strategy** covering all requirements from Phase 1 (Bug Fixes R1–R2), Phase 2 (Vyapar-Inspired Medical Features R3–R9), and Phase 3 (Deployment & Verification R10).

---

## 1. Build Pipeline & Monorepo Investigation

### 1.1 Workspace Architecture
The repository is structured as an npm/Turborepo monorepo:
- **`apps/web`**: Next.js 14.2.20 (App Router), React 18.3.1, TanStack Query v5, Tailwind CSS, Lucide icons, GSAP, Three.js / React Three Fiber.
- **`apps/api`**: NestJS 10.4.15, Express, Prisma 5.22.0, Passport JWT/Local, Argon2, ExcelJS, PDFKit, Zod.
- **`packages/shared-types`**: TypeScript interfaces, enums (`DrugSchedule`, `BatchStatus`, `InvoiceStatus`, `PaymentMode`, `UnitLevel`, etc.).
- **`packages/constants`**: Application constants, error codes, tax rates, unit presets.
- **`packages/shared-utils`**: Pure domain functions (`fefo.ts`, `currency.ts`, `barcode.ts`, `sequencers.ts`, `thermal-receipt.ts`, `whatsapp.ts`, `unit-conversion.ts`).
- **`packages/validation`**: Zod validation schemas shared across web and API.

### 1.2 Build Verification Results

| Target | Build Tool / Command | Exit Code | Result Summary |
|---|---|---|---|
| `packages/shared-types` | `tsc -b` | `0` | Clean build, type definitions generated in `dist/` |
| `packages/constants` | `tsc -b` | `0` | Clean build, constants exported in `dist/` |
| `packages/shared-utils` | `tsc -b` | `0` | Clean build, pure domain utilities built in `dist/` |
| `packages/validation` | `tsc -b` | `0` | Clean build, Zod schemas compiled in `dist/` |
| `apps/api` | `nest build` + `postbuild` | `0` | NestJS dist artifacts compiled and copied to `dist/main.js` |
| `apps/web` | `next build` | `0` | Compiled successfully; **17/17** static and dynamic App Router routes generated |

### 1.3 Critical Monorepo Anomaly & Fix Requirement
- **Observation**: The root `package.json` was temporarily replaced with a desktop accounting app configuration (`"name": "Vyaparapp", "version": "33.2.0"`), which omits the `workspaces: ["apps/*", "packages/*"]` key and Turborepo root scripts.
- **Impact**: Invoking `turbo run build` or `npm run dev` at the repository root fails if workspaces are disabled.
- **Resolution**: Root `package.json` must be restored to its canonical monorepo configuration (`medical-inventory-erp-pos`) as tracked in git history.

---

## 2. Database Synchronization & Connectivity

### 2.1 Schema Location & Provider
- **Location**: `prisma/schema.prisma` at workspace root.
- **Provider**: `postgresql` via `env("DATABASE_URL")`.
- **Active Models**: 42 relational models including `User`, `Role`, `Permission`, `Medicine`, `Unit`, `MedicineUnit`, `Batch`, `StockMovement`, `Customer`, `Supplier`, `PurchaseInvoice`, `PurchaseItem`, `SalesInvoice`, `SalesItem`, `SalesPayment`, `SalesReturn`, `PartyItemPrice`, `PrescriptionRecord`, `PurchaseOrder`, `PurchaseOrderItem`.

### 2.2 Neon Database Live Connectivity Verification
- **Connection URI**: `postgresql://neondb_owner:npg_zprDj3gNco1W@ep-bitter-recipe-aywnmxlu.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Verification Script**: Executed `npx tsx .agents/explorer_survey_3/test_neon.ts` against the live endpoint.
- **Live Counts Verified**:
  - `User`: 1 (Admin)
  - `Role`: 7
  - `Branch`: 1 (Main Pharmacy Branch)
  - `Medicine`: 9
  - `Batch`: 12
- **Network Latency & Interactive Transaction Timeout Finding**:
  - The Neon cluster is hosted in AWS us-east-2.
  - Multi-query interactive transactions (`prisma.$transaction(async (tx) => { ... })`) hit the default 5000ms timeout (`P2028`) when executing 10+ sequential roundtrips over high-latency WAN connections.
  - **Remediation Rule**: All interactive transaction calls in API services and test harnesses must specify an extended timeout:
    ```typescript
    await prisma.$transaction(async (tx) => { ... }, {
      maxWait: 10000,
      timeout: 30000,
    });
    ```

---

## 3. Git Status & Deployment Configuration

### 3.1 Git Remote & Branches
- **Remote Origin**: `https://github.com/ck724280-gif/medical_inventiroy.git`
- **Current Branch**: `main` (synchronized with `origin/main`).
- **Deployment Pipelines**:
  - **Frontend**: Vercel Git integration tracking `main` branch, triggering Next.js builds on push.
  - **Backend**: Render Web Service tracking `main` branch, building NestJS and hosting `https://medical-inventiroy.onrender.com`.
  - **Database Migration**: `npx prisma db push` applying schema updates directly to the Neon PostgreSQL instance.

---

## 4. Test Runner & Harness Architecture

### 4.1 Test Engine
- **Engine**: Node.js Native Test Runner (`node:test` + `node:assert/strict`).
- **Invocation**: `tsx --test tests/runner.ts` (or `npm test`).
- **Suites Organized By**:
  - `tests/tier1-feature-coverage/`
  - `tests/tier2-boundary-corner-cases/`
  - `tests/tier3-cross-feature-combinations/`
  - `tests/tier4-real-world-workloads/`
  - `tests/adversarial-challenger1-stress.test.ts`
  - `tests/challenger_2_empirical_stress.test.ts`

---

## 5. 4-Tier E2E Testing Strategy Design

To ensure zero regressions and 100% compliance across all 10 requirements (R1–R10), the test strategy is structured into 4 comprehensive tiers with >=5 assertions per feature.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 4-TIER E2E TEST STRATEGY                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Feature Coverage (>=5 test cases per feature R1–R10)                           │
│   • R1: API Paginated Response Unwrapping across all 11 Web Pages                      │
│   • R2: Auth JWT Token Storage, Bearer Header Injection, & Auto-Redirect               │
│   • R3: Multi-Level Unit Conversion (Box → Strip → Tablet) & Base Stock Math           │
│   • R4: Party-Wise Special Pricing & Discount Matrix Auto-Fill Engine                  │
│   • R5: GST Returns (GSTR-1 B2B/B2C, GSTR-3B Tax Comparison, HSN Summary)             │
│   • R6: Barcode Label Generation & 40x20mm Thermal Print Formatter                     │
│   • R7: Schedule H/H1/X Mandatory Prescription Registry & Legal Export                 │
│   • R8: WhatsApp Dynamic Share Link & Payment Reminder Formatter                       │
│   • R9: Purchase Order (PO) Lifecycle & 1-Click Inward Bill Auto-Conversion            │
│   • R10: Live Production Health Check & Schema Migration Verification                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: Boundary & Corner Cases (>=5 test cases per feature)                           │
│   • Zero, negative, fractional, and massive quantities                                │
│   • Expired, quarantined, and same-day expiry batch boundaries                         │
│   • Missing HSN, invalid GSTIN checksums, 100% discount, zero tax                      │
│   • Null/empty party selection, missing optional phone numbers                         │
│   • Partial PO receipt, over-received quantities, PO cancellation guardrails           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: Cross-Feature Combinations & Transactional Workflows                           │
│   • Workflow 1: PO Inward → Unit Conversion Batch → Special Price Sale → GSTR-1        │
│   • Workflow 2: Schedule H Purchase → FEFO Split Sale → Prescription Log → Register    │
│   • Workflow 3: Multi-Unit Sale → Resalable Return → Stock Restoration → GSTR-1 Credit │
│   • Workflow 4: Atomic Rollback on Mid-Transaction Stock Shortage                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 4: Real-World Scenarios & Pharmacy Simulation Workloads                           │
│   • Scenario 1: Busy Pharmacy Peak Hours (Concurrent Multi-Tender Checkouts)           │
│   • Scenario 2: Batch Recall & Quarantine Simulation Across All Existing Stock         │
│   • Scenario 3: Monthly GST Filing Reconciliation & Drug Inspector Compliance Audit    │
│   • Scenario 4: End-to-End Procurement-to-Dispensation Lifecycle                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Tier 1: Feature Coverage Specifications (>=5 Tests Per Feature)

#### R1: Runtime Crashes & API Unwrapping
1. `unwrapApiResponse({ data: [item1, item2], meta: { total: 2 } })` returns clean array `[item1, item2]`.
2. `unwrapApiResponse([item1, item2])` handles flat array correctly.
3. `unwrapApiResponse({ data: null })` returns empty array `[]` without throwing.
4. `unwrapApiResponse(undefined)` / `unwrapApiResponse(null)` returns `[]`.
5. Safe `.map()` execution on all 11 routes (`/suppliers`, `/customers`, `/purchases`, `/sales`, `/medicines`, `/inventory`, `/expenses`, `/sales-returns`, `/reports`, `/pos`, `/import`) when backend returns `{ data: [] }` or empty payloads.

#### R2: Authentication & JWT Management
1. Valid credentials (`admin@medcare.com` / `Admin@123456`) generate valid JWT payload with user ID, email, and role.
2. Invalid password triggers `401 Unauthorized` without session creation.
3. API Client intercepts requests and attaches `Authorization: Bearer <token>`.
4. Expired token response (401) triggers token clearance and router redirect to `/login`.
5. `NEXT_PUBLIC_API_URL` environment variable defaults cleanly to `https://medical-inventiroy.onrender.com` or local fallback.

#### R3: Multi-Level Unit Conversion Engine
1. Box → Strip → Tablet conversion ratio calculation (e.g., 1 Box = 10 Strips, 1 Strip = 10 Tablets → 1 Box = 100 Tablets).
2. Selling 3 loose tablets deducts exactly `3 / 100 = 0.03` boxes (or 3 base units).
3. Purchase entry in Boxes automatically populates available Strips and Tablets stock counts.
4. Mixed unit line items calculate total price accurately based on selected unit level.
5. Base quantity integer storage avoids floating-point stock rounding errors.

#### R4: Party-Wise Special Pricing & Discount Matrix
1. Special price lookup returns customized rate when party-item price rule exists and is active (`effectiveFrom <= now <= effectiveTo`).
2. Special discount percent applies on top of MRP if configured.
3. Fallback to default medicine MRP/selling price when no party-specific rule matches.
4. Party price expiration: Outdated rule (`effectiveTo < now`) is ignored in favor of base price.
5. POS customer selection auto-triggers price recalculation for all cart items.

#### R5: GST Return Reports (GSTR-1, GSTR-3B, HSN Summary)
1. GSTR-1 categorizes B2B invoices (with GSTIN) vs B2C invoices (without GSTIN).
2. GSTR-3B aggregates Total Outward Taxable Value, Integrated Tax (IGST), Central Tax (CGST), and State Tax (SGST).
3. Input Tax Credit (ITC) from Purchases is correctly matched against Output Tax to compute Net GST Payable.
4. HSN Summary groups items by 4-8 digit HSN codes, summarizing total quantity, taxable turnover, and tax amounts per slab (0%, 5%, 12%, 18%, 28%).
5. ExcelJS export generates downloadable `.xlsx` workbook with valid sheets and numeric cell formatting.

#### R6: Thermal Barcode Label Printing
1. Barcode generator creates valid Code-128 / EAN-13 SVG/Canvas for given medicine and batch code.
2. Label template renders within 40mm x 20mm dimensions with Medicine Name, Batch, Expiry, MRP, and Barcode.
3. Print dialog trigger dispatches CSS `@media print` rules with 0 margin and exact millimeter sizing.
4. Bulk label generation calculates correct quantity of labels corresponding to received purchase package count.
5. Graceful truncation of ultra-long medicine names to prevent label overflow.

#### R7: Schedule H / H1 Drug Register
1. Adding Schedule H/H1 medicine flags requirement for Prescription metadata in sale payload.
2. Prescription validator requires Doctor Name, Doctor Reg No, Patient Name, Patient Age, and Rx Number.
3. Sale submission persists `PrescriptionRecord` linked to `SalesInvoice` and `SalesItem`.
4. OTC medicine checkout proceeds without requiring prescription details.
5. Schedule H Register report filters records within date range and exports legal compliance report in Excel.

#### R8: WhatsApp Invoice Sharing & Payment Reminder
1. `sanitizeMobileForWhatsApp` converts `9876543210` to `919876543210` and strips invalid symbols.
2. `buildWhatsAppUrl` generates `https://wa.me/919876543210?text=...` with valid URI encoding.
3. Sale invoice message contains Business Name, Invoice No, Date, Total, Payment Status, and Line Items.
4. Payment reminder message contains Customer Name, Outstanding Balance, UPI ID, and Bank Account details.
5. WhatsApp buttons on POS, Sales, and Customer tables trigger browser window open with compiled URL.

#### R9: Purchase Order Auto-Conversion
1. Creating PO sets status to `DRAFT` or `SENT` with line items, quantities, and expected rates.
2. PO conversion endpoint creates pre-filled Purchase Inward structure with matching supplier and item details.
3. Modifying inward quantities during conversion updates `receivedQty` on PO items.
4. Saving inward purchase marks PO status as `FULLY_RECEIVED` (or `PARTIALLY_RECEIVED`) and links `convertedPurchaseId`.
5. Attempting to convert an already `FULLY_RECEIVED` or `CANCELLED` PO throws validation error.

#### R10: Live Deployment & Health Verification
1. Render backend `GET /api/health` returns `200 OK` with uptime and database status.
2. Vercel frontend root `/` loads HTTP 200 with HTML document structure.
3. Live authentication endpoint authenticates `admin@medcare.com`.
4. Prisma schema is fully synced with Neon DB without pending migrations.
5. Git working tree is clean with all changes committed to `origin/main`.

---

## 6. Implementation & Execution Recommendations

1. **Restore Root `package.json`**: Restore the original monorepo `package.json` to enable `turbo run build`, `npm run dev`, and workspaces.
2. **Transaction Timeout Configuration**: In all Prisma `$transaction` blocks across services (`sales.service.ts`, `sales-returns.service.ts`, `purchases.service.ts`, `purchase-orders.service.ts`), set `{ timeout: 30000, maxWait: 10000 }` to ensure reliable execution against cloud databases.
3. **Register All Tests in `tests/runner.ts`**: Import and run the complete test suite across all 4 tiers during `npm test`.
4. **Deploy in Phased Sequence**:
   - Run `npx prisma db push` against Neon DB.
   - Run package builds (`packages/*`).
   - Run NestJS backend build and verify.
   - Run Next.js frontend build and verify.
   - Commit and push to `origin/main` for Vercel & Render automated continuous delivery.
