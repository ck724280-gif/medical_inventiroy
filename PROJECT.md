# Project: Medical Inventory ERP P3 UI/UX Redesign

## Architecture
- **Monorepo Structure**: Turborepo + npm workspaces.
  - `apps/web`: Next.js 14 (App Router), Tailwind CSS with semantic CSS variable tokens, Lucide icons, React Query, Zustand stores, Recharts.
  - `apps/api`: NestJS / Express backend API, Prisma ORM, search and settings modules.
  - `packages/shared-utils`: Shared utilities, WhatsApp formatters, validation schemas.
- **Design System Foundation (M1 complete)**:
  - `apps/web/src/app/globals.css`: 40+ semantic CSS tokens for light & dark mode.
  - `apps/web/tailwind.config.ts`: Semantic colors mapped to CSS variables.
  - `apps/web/src/components/ui/`: 14 primitives (`Badge`, `Button`, `Card`, `DataTable`, `EmptyState`, `Input`, `Modal`, `PageHeader`, `Select`, `Skeleton`, `SmartAutocomplete`, `Tabs`, `Toast`, `index.ts`).
- **Critical Protections**:
  - **P1 Search**: `apps/web/src/components/ui/smart-autocomplete.tsx`, `apps/web/src/components/global-command-palette.tsx`, `apps/api/src/modules/search/`.
  - **P2 Branding**: `apps/web/src/stores/branding-store.ts`, `apps/web/src/lib/whatsapp-share.ts`, `apps/api/src/modules/settings/`, `packages/shared-utils/src/whatsapp.ts`, `apps/web/src/components/thermal-receipt-preview.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1.1 Sidebar Section Grouping | Group 14 items under OPERATIONS, INVENTORY, PEOPLE, FINANCE, MANAGEMENT | M1 (DONE) | Survey E1 |
| 2 | R1.2 Sidebar Full-Width Active Pill | Replace border-l-2 with full-width accent pill active indicator | M1 (DONE) | Survey E1 |
| 3 | R1.3 Sidebar Collapsible Mode | 56px icon-only collapse / 240px expand toggle with tooltips & ui-store | M1 (DONE) | Survey E1 |
| 4 | R1.4 Sidebar User Profile Footer | Colored initials avatar + user name + role chip | M1 (DONE) | Survey E1 |
| 5 | R1.5 Header Icon Button Uniformity | 36px touch targets, rounded-lg, uniform hover backgrounds | M1 (DONE) | Survey E1 |
| 6 | R1.6 Header Theme Toggle & Notifications | Icon-only theme toggle + numeric unread badge on bell | M1 (DONE) | Survey E1 |
| 7 | R1.7 Header Branch Selector & P1 Search | Clean pill design, preserve SmartAutocomplete & Command Palette | M1 (DONE) | Survey E1 |
| 8 | R1.8 Mobile Navigation Bar | Bottom bar (<lg) with 5 tabs + More drawer + iOS safe area | M1 (DONE) | Survey E1 |
| 9 | R1.9 Root Layout Integration | Render MobileNav, add bottom padding (pb-16 lg:pb-0) | M1 (DONE) | Survey E1 |
| 10 | R2.1 Dashboard Canvas & Motion Cleanup | Remove SpatialMedicalCanvas & framer-motion stagger variants | M2 (DONE) | Survey E1 |
| 11 | R2.2 Dashboard 4 KPI Tiles Grid | Today's Sales, Net Revenue, Stock Value, Low-Stock Alerts | M2 (DONE) | Survey E1 |
| 12 | R2.3 Dashboard Recharts Sales Trend | Full-width LineChart styled with design tokens | M2 (DONE) | Survey E1 |
| 13 | R2.4 Dashboard Invoices & Quick Actions | Recent Invoices DataTable + 4 Quick Action buttons | M2 (DONE) | Survey E1 |
| 14 | R3.1 Login Page 2-Column Responsive | 40/60 split on md+, single col mobile, left accent branding panel | M2 (DONE) | Survey E1 |
| 15 | R3.2 Login Form & Password Toggle | Input/Button primitives + Eye/EyeOff toggle + reactive P2 storeLogo | M2 (DONE) | Survey E1 |
| 16 | R4.1 POS Billing Visual Token Refresh | Semantic design tokens on POS counter, 100% logic preservation | M2 (DONE) | Survey E1 |
| 17 | R4.2 POS Barcode, Hotkeys & Split Payment | Hardware/camera scanners, F1-F9 hotkeys, split tender, shift register | M2 (DONE) | Survey E1 |
| 18 | R5.1 Sales & Invoices Redesign | PageHeader + DataTable + WhatsApp (P2) + Thermal Receipt + PDF | M3 | Survey E2 |
| 19 | R5.2 Purchases & Inward Redesign | PageHeader + DataTable + PO Session convert + Barcode Label engine | M3 | Survey E2 |
| 20 | R5.3 Purchase Orders Redesign | PageHeader + Status Tabs + DataTable + Convert to Bill flow | M3 | Survey E2 |
| 21 | R5.4 Medicines Master Redesign | PageHeader + DataTable + Stock Badge (in/low/out) + Drug Schedule | M3 | Survey E2 |
| 22 | R5.5 Inventory & Batches Redesign | 4 Tabs + Expiry Badge (expired/<90d/ok) + Stock Adjustments | M3 | Survey E2 |
| 23 | R5.6 Sales Returns Redesign | PageHeader + 3 KPI Cards + Invoice lookup + dynamic storeName WhatsApp | M3 | Survey E2 |
| 24 | R5.7 Customers & Patients Redesign | PageHeader + KPI Cards + DataTable + Party Pricing + WhatsApp Reminders | M4 | Survey E3 |
| 25 | R5.8 Suppliers & Distributors Redesign | PageHeader + KPI Cards + DataTable + Add/Edit Supplier modal | M4 | Survey E3 |
| 26 | R5.9 Expenses & Payouts Redesign | PageHeader + Category Filter + DataTable + Debit Voucher Print | M4 | Survey E3 |
| 27 | R5.10 Reports & Legal Analytics Redesign | 7 Tabs (P&L, Sales, Inventory, GSTR-1, GSTR-3B, HSN, Schedule H) + Excel | M4 | Survey E3 |
| 28 | R5.11 Settings & P2 Branding Redesign | 2-col desktop layout + 100% P2 Branding (logo upload, colors, PrintStudio) | M4 | Survey E3 |
| 29 | R5.12 Opening Stock & Import Redesign | Dashed file drop zone + Excel paste + Valuation KPIs + Grid + Audit table | M4 | Survey E3 |
| 30 | R6.1 Zero Regression Build & Test Gate | API build exits 0, Web build exits 0 (18 routes), npm test 100/100 pass | M5 | Survey E1,E2,E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Navigation & Shell Redesign | `sidebar.tsx`, `header.tsx`, `mobile-nav.tsx`, `layout.tsx`, `ui-store.ts` | none | DONE |
| M2 | Auth, Dashboard & POS Hub | `login/page.tsx`, `app/page.tsx` (Dashboard), `pos/page.tsx` (POS refresh) | M1 | DONE |
| M3 | Core Transactional & Inventory Pages | `sales/page.tsx`, `purchases/page.tsx`, `purchase-orders/page.tsx`, `medicines/page.tsx`, `inventory/page.tsx`, `sales-returns/page.tsx` | M1 | PLANNED |
| M4 | Master Data, Finance & Admin Pages | `customers/page.tsx`, `suppliers/page.tsx`, `expenses/page.tsx`, `reports/page.tsx`, `settings/page.tsx`, `import/page.tsx` | M1 | PLANNED |
| M5 | Final E2E Build Verification & Gate | `apps/api` build, `apps/web` build, root `npm test`, forensic audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### UI Primitives Contract
- All pages use `apps/web/src/components/ui/` primitives:
  - `PageHeader`: Title, subtitle, actions, role badge, breadcrumbs.
  - `DataTable`: Generic typed table with columns array, empty state, pagination.
  - `Badge`: Semantic variants (`default`, `success`, `warning`, `error`, `info`, `outline`).
  - `Button`: Semantic variants (`primary`, `secondary`, `ghost`, `destructive`, `outline`), loading states, leftIcon/rightIcon.
  - `Modal`: Accessible dialogs with header, content, footer, sizes.
  - `Input` / `Select`: Semantic form inputs with label, error, helperText, icons.
  - `Card`: Semantic container elevation (`flat`, `raised`, `floating`).
  - `Skeleton` & `EmptyState`: Standardized loading and empty states.
  - `Tabs`: Underline and pill navigation variants.

### State & Cross-Page Contracts
- `useUiStore`: `isSidebarCollapsed: boolean`, `toggleSidebarCollapsed: () => void`, `isMobileSidebarOpen: boolean`.
- `useBrandingStore`: `name: storeName`, `logo: storeLogo`, `fetchBranding()`, `updateLogoImmediately(url)`.
- `useAuthStore`: `user`, `selectedBranchId`, `hasPermission(perm)`, `isSuperAdmin()`.
- PO-to-Inward: `sessionStorage.setItem('medcare_po_convert', ...)` parsed on `/purchases`.

## Code Layout
- `apps/web/src/stores/ui-store.ts` — UI layout state.
- `apps/web/src/components/sidebar.tsx` — Main sidebar.
- `apps/web/src/components/header.tsx` — Top header bar.
- `apps/web/src/components/mobile-nav.tsx` — Mobile bottom navigation bar.
- `apps/web/src/app/layout.tsx` — Next.js root layout.
- `apps/web/src/app/page.tsx` — Dashboard.
- `apps/web/src/app/login/page.tsx` — Login screen.
- `apps/web/src/app/pos/page.tsx` — POS billing counter.
- `apps/web/src/app/sales/page.tsx` — Sales & Invoices.
- `apps/web/src/app/purchases/page.tsx` — Purchases & Inward stock.
- `apps/web/src/app/purchase-orders/page.tsx` — Purchase orders.
- `apps/web/src/app/medicines/page.tsx` — Medicines master catalog.
- `apps/web/src/app/inventory/page.tsx` — Inventory & Batches.
- `apps/web/src/app/sales-returns/page.tsx` — Sales returns & refunds.
- `apps/web/src/app/customers/page.tsx` — Customers directory.
- `apps/web/src/app/suppliers/page.tsx` — Suppliers directory.
- `apps/web/src/app/expenses/page.tsx` — Expenses ledger.
- `apps/web/src/app/reports/page.tsx` — Reports & Legal analytics.
- `apps/web/src/app/settings/page.tsx` — Settings & P2 Branding.
- `apps/web/src/app/import/page.tsx` — Opening stock CSV import.
