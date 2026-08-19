# Architecture Survey Report: Web ERP & POS Terminal (R4) and Mobile POS (R5)

**System:** Single-Business Multi-Branch Medical Inventory & Pharmacy ERP / POS
**Working Directory:** `d:/antigravity programme/medical_inventory`
**Date:** 2026-08-19
**Explorer:** Explorer 3 (Frontend Web ERP/POS & Mobile Architecture)

---

## 1. Executive Summary & Workspace Topology

This report delivers a deep architectural survey and technical blueprint of the frontend web applications and mobile apps for the Medical Inventory & Pharmacy ERP/POS System. The workspace is built as a high-performance monorepo using **Turborepo** and **npm workspaces**, linking shared core packages (`@medical-inventory/shared-types`, `@medical-inventory/constants`, `@medical-inventory/shared-utils`, `@medical-inventory/validation`) with the web application (`apps/web`) and mobile application (`apps/mobile`).

### Monorepo Topology & Linkage

```
d:/antigravity programme/medical_inventory/
├── apps/
│   ├── api/                     # NestJS 10 REST API Server (20+ domain modules)
│   ├── web/                     # Next.js 14 App Router Web ERP & POS Billing Terminal
│   └── mobile/                  # Expo / React Native Mobile POS & Barcode Scanner
├── packages/
│   ├── shared-types/            # Shared TypeScript domain models & DTOs
│   ├── constants/               # RBAC matrix, default roles, tax slabs, payment modes
│   ├── shared-utils/            # FEFO allocation, currency math, ESC/POS formatters
│   └── validation/              # Zod validation schemas
├── prisma/
│   ├── schema.prisma            # 38+ relational models
│   └── seed/                    # Admin user, business settings, sample pharmacy seed
├── package.json                 # Monorepo workspaces definition
├── turbo.json                   # Build & test task pipeline
└── tsconfig.base.json           # Shared TypeScript compiler configuration
```

---

## 2. Web ERP & POS Terminal Architecture (`apps/web`)

The web application is implemented using **Next.js 14 App Router**, **React 18**, **Tailwind CSS**, **Lucide React**, **Zustand v5**, **TanStack React Query v5**, **Recharts**, **React To Print**, **Three.js / React Three Fiber**, and **GSAP / Framer Motion**.

### 2.1 Route Hierarchy & Page Catalog

| Route | Page Module | Key Capabilities |
|---|---|---|
| `/login` | Authentication Portal | Secure credentials login, JWT store persistence, dynamic store branding preview. |
| `/` | Operational Dashboard | Real-time sales/profit stats, Recharts trend lines, quick POS action, interactive 3D spatial pill canvas. |
| `/pos` | POS Billing Counter | High-speed keyboard billing (F1-F12), USB/Bluetooth barcode scan listener, FEFO batch selector, split payments, 58mm/80mm ESC/POS thermal receipt modal. |
| `/medicines` | Medicine Master Catalog | Master pharmaceutical catalog, generic name lookup, dosage forms, HSN codes, GST tax slabs, reorder thresholds, modal creator/editor. |
| `/inventory` | Batch Inventory & Expiry | Multi-tab view: All Batches with stock status, Expiry Dashboard with 5 urgency brackets, Automated Reorder Suggestions, and Stock Movements Ledger. |
| `/purchases` | Inward Purchases & GRN | Vendor invoice entry, item-wise batch/expiry/price recording, Draft vs. Confirmed GRN status, vendor payment logging. |
| `/sales` | Sales & Invoices History | Complete audit of completed invoices, customer search, PDF invoice generation, thermal receipt reprinting. |
| `/sales-returns` | Sales Returns & Refunds | Original invoice lookup, item-level return quantity, condition routing (Resalable -> active stock, Damaged/Expired -> quarantine), refund payment mode. |
| `/suppliers` | Suppliers & Distributors | Vendor directory, contact details, GSTIN, drug license, outstanding balance tracking. |
| `/customers` | Customers & Patients | Patient directory, contact numbers, address, purchase invoice history. |
| `/expenses` | Business Expenses | Operational expense ledger (Rent, Electricity, Salary, Maintenance, Logistics), category breakdown. |
| `/reports` | Financial & Analytics | P&L statements (Revenue, COGS from actual batch purchase costs, Gross Margin, Net Profit), Sales ledger, Inventory valuation, Excel exports. |
| `/import` | Opening Stock Import Wizard | Interactive bulk spreadsheet grid for importing initial medicines, batches, quantities, purchase rates, MRPs, and expiry dates before go-live. |
| `/settings` | System Settings Panel | Store profile & legal details, 100% white-label theme colors, thermal receipt template designer, multi-branch management, DB backup triggers. |

---

### 2.2 High-Speed Desktop POS Counter (`/pos`) Deep Dive

The POS counter is engineered for rapid retail checkout in busy medical stores:

1. **Ergonomic Split Layout**:
   - **Left Panel**: Dual-input scanner bar (instant barcode scanner input + typeahead medicine search) and real-time items table showing item name, SKU, FEFO batch tag, unit, unit rate, quantity modifier buttons, item discount %, and calculated line total.
   - **Right Panel**: Customer quick-tagging (Patient Name, Mobile), invoice-level discount input, multi-mode payment selector (Cash, Card, UPI, Credit/Split), receipt paper width toggle (58mm vs. 80mm), and primary Complete Sale checkout trigger.
2. **Keyboard Shortcut Engine**:
   - `F1`: Focus Barcode Scanner input box immediately.
   - `F2`: Focus Medicine Name / Generic Typeahead search input box.
   - `F9`: Trigger Instant Checkout & Thermal Receipt Generation.
   - `F11`: Toggle POS Fullscreen mode for distraction-free billing.
   - `ESC`: Dismiss open dropdowns / modals / cancel operation.
3. **FEFO Automatic Allocation & Expiry Safeguards**:
   - Barcode scans hit `/pos/scan/:barcode`, which resolves the medicine and calls backend FEFO allocation to automatically select the earliest-expiring active batch with non-zero stock.
   - Expired batches (`expiryDate <= NOW`) are strictly blocked from dispensation.
   - Near-expiry warnings (<30 days) are visually highlighted with amber/orange badges on the cart row.
4. **Split Payments & Khata Credit**:
   - Supports single or multi-tender payments (e.g. Cash + UPI + Card).
   - Real-time computation of `Grand Total`, `Total Paid`, and `Balance Due`.
5. **Thermal Receipt Printing Engine**:
   - Seamless integration with `react-to-print` rendering monospace 58mm (w-260px) and 80mm (w-320px) thermal receipts formatted strictly according to ESC/POS standards with dashed separators, itemized batch/expiry rows, subtotal, tax/GST breakdown, and store footer policies.

---

### 2.3 Interactive 3D Spatial Medical Widget (`SpatialMedicalCanvas`)

Implemented using **React Three Fiber (`@react-three/fiber`)**, **Three.js (`three`)**, and **Drei (`@react-three/drei`)**:
- **Geometry**: Composed 3D pharmaceutical capsule pill with a sky-blue upper dome cylinder, pure white lower dome cylinder, and a dark-blue separating ring.
- **Lighting & Materials**: Ambient lighting (0.8), key point light (1.2), and cyan fill rim light (`#38bdf8`) with smooth metallic roughness (0.2).
- **Motion & Interaction**: Uses `@react-three/drei` Float component for gentle weightless floating; interactive hover listeners accelerate rotation speed smoothly on user interaction.
- **Performance Optimization**: Rendered with anti-aliasing and alpha transparency in a lightweight 112px spatial frame on the dashboard header.

---

### 2.4 Dynamic White-Label Branding & Theme Propagation System

The frontend contains a centralized branding state machine (`useBrandingStore` in `apps/web/src/stores/branding-store.ts`):
1. On app boot, `useBrandingStore.fetchBranding()` queries `/settings/public`.
2. Dynamically updates CSS root variables:
```css
:root {
  --color-primary: #0284c7;
  --color-secondary: #0f172a;
}
```
3. Dynamically binds store name, logo URL, contact phone, store address, GSTIN, and Pharmacy Drug License number to the sidebar header, POS receipts, tax invoice headers, and authentication screens.

---

### 2.5 Expiry Tracking Dashboard (5 Distinct Urgency Brackets)

Located at `/inventory` (Expiry Dashboard Tab):
1. **Bracket 1: Expired (`<= 0 days`)** — Highlighted in deep red; items are blocked from POS sale and flagged for immediate supplier return or quarantine disposal.
2. **Bracket 2: Critical / 7-30 Days (`1 - 30 days`)** — Highlighted in amber/orange; estimated stock value displayed for rapid promotional clearance.
3. **Bracket 3: Medium / 30-60 Days (`31 - 60 days`)** — Monitored for sales velocity pacing.
4. **Bracket 4: Advance / 60-90 Days (`61 - 90 days`)** — Reorder pacing alert.
5. **Bracket 5: Safe / >90 Days (`> 90 days`)** — Standard active pharmaceutical stock.

---

### 2.6 Opening Stock Bulk Import Wizard (`/import`)

Located at `/import`:
- Provides an editable batch grid allowing store managers to enter or paste opening inventory lines (Medicine Name, SKU, Dosage Form, Batch Number, Mfg Date, Expiry Date, Quantity, Purchase Price, MRP, Selling Price, Tax %).
- Single-click bulk ingestion hits `/import-export/opening-stock` inside atomic database transactions to initialize inventory without manual purchase invoice entry.

---

## 3. Mobile POS & Barcode Scanner Architecture (`apps/mobile`)

The mobile application is built with **Expo SDK 51**, **React Native 0.74**, **TypeScript**, **Lucide React Native**, and **Zustand**:

1. **Hardware Barcode Scanning**:
   - Utilizes `expo-camera` and `expo-barcode-scanner` to read 1D EAN-13, UPC-A, Code-128, and 2D DataMatrix/QR codes via smartphone camera.
2. **Mobile Cart & FEFO Dispensation**:
   - Lightweight cart state machine with item quantity increments, batch badges, and instant grand total calculation.
3. **Bluetooth Thermal Receipt Printing Hooks**:
   - Configured for portable 58mm Bluetooth ESC/POS receipt printers.
   - Generates monospace receipt strings containing invoice number, itemized lines, GST summary, and store header for wireless thermal dispatch.
4. **Mobile Navigation & Offline-Aware Design**:
   - Clean bottom navigation tabs (POS Billing, Scanner, Inventory Check).

---

## 4. State Management & API Integration Layer

### 4.1 Zustand State Stores
- **`useAuthStore`** (`apps/web/src/stores/auth-store.ts`):
  - Manages JWT access token, refresh token, authenticated user profile, multi-branch list, `selectedBranchId`, and RBAC `hasPermission(permissionCode)` utility.
- **`useBrandingStore`** (`apps/web/src/stores/branding-store.ts`):
  - Synchronizes store name, logo, primary color, secondary color, currency symbol, address, GSTIN, and drug license.
- **`useCartStore`** (`apps/web/src/stores/cart-store.ts`):
  - POS active cart state machine: item lines, customer tag, multi-tender payments, paper width (58mm/80mm), line-level & invoice-level discounts, and subtotal/tax/grand total calculations using `@medical-inventory/shared-utils`.

### 4.2 API Client & TanStack React Query
- **`apiClient`** (`apps/web/src/lib/api-client.ts`):
  - Axios instance configured with base URL, `Authorization: Bearer <token>` injection, and auto-refresh interceptors.
- **TanStack Query v5**:
  - Comprehensive query caching and automatic invalidation on mutations (e.g. invalidating `inventory-batches` on purchase confirmation or sales return).

---

## 5. Build Diagnostics & Findings

During compile diagnostics (`npm run build`):
1. **Web App Dependency**: `apps/web/src/app/login/page.tsx` imports `@hookform/resolvers/zod`, but `@hookform/resolvers` is not listed in `apps/web/package.json` dependencies.
   - *Resolution for implementer*: Add `@hookform/resolvers: ^3.9.1` to `apps/web/package.json` dependencies.
2. **Backend Type Fix**: `apps/api/src/modules/branches/branches.service.ts` line 86 expects `businessHours` to be serialized as a string or matching schema.
3. **Mobile App**: `apps/mobile` dependencies and TypeScript configurations are cleanly organized for Expo 51.

---

## 6. Conclusion

The Web ERP & POS Terminal (`apps/web`) and Mobile POS (`apps/mobile`) architectures are completely specified and comprehensively aligned with all 70 sections of the master architecture prompt and requirements R4 and R5. The UI/UX provides enterprise-grade ergonomics, FEFO safety, white-label branding, 3D spatial visual polish, 58mm/80mm ESC/POS receipt generation, and multi-branch support.
