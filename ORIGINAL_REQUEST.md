# Original User Request

## 2026-08-22T08:38:31Z

Transform the existing Medical Inventory ERP frontend from an AI-generated-looking dashboard into a professional, production-grade SaaS UI with a complete design system, responsive layouts, and consistent component library — while preserving 100% of existing backend functionality, APIs, and business logic.

Working directory: d:\antigravity programme\medical_inventory
Integrity mode: development

---

## CRITICAL CONTEXT — Read Before Starting

This is Day 3 of a 7-day ERP build. Days 1 and 2 are already complete and MUST NOT be broken:

### Day 1 (P1) — Search System (DO NOT TOUCH)
- pps/api/src/modules/search/ — Search module with universal + per-entity endpoints
- pps/web/src/components/ui/smart-autocomplete.tsx — Global search component
- pps/web/src/components/global-command-palette.tsx — Ctrl+K command palette
- The search is integrated into header.tsx — keep it working

### Day 2 (P2) — Branding System (DO NOT TOUCH LOGIC, ONLY VISUAL)
- pps/web/src/stores/branding-store.ts — useBrandingStore Zustand store (logo, storeName, favicon, updatedAt, updateLogoImmediately)
- pps/web/src/lib/whatsapp-share.ts — shareInvoiceViaWhatsApp function
- pps/api/src/modules/settings/ — settings.service.ts + settings.controller.ts (logo upload endpoint, cache-busting)
- packages/shared-utils/src/whatsapp.ts — generateSaleInvoiceMessage with dynamic storeName
- pps/web/src/components/thermal-receipt-preview.tsx — DO NOT TOUCH (print-specific)
- In settings/page.tsx: keep all uploadLogoMutation, color picker, and branding logic intact
- In login/page.tsx: keep useBrandingStore reactive storeLogo
- In sales/page.tsx and sales-returns/page.tsx: keep dynamic storeName in WhatsApp messages

---

## Requirements

### R1. Design System Foundation
Establish a semantic CSS token layer in pps/web/src/app/globals.css (40+ CSS variables for both :root light mode and .dark dark mode). Update pps/web/tailwind.config.ts to use CSS-variable-driven semantic colors. Remove AI-template artifacts: glow-cyan shadows, urora/pulse-ring/cyan-pulse keyframes, glass and obsidian color tokens. Retain rand color scale (used by P2 branding), ade-slide-up, ade-in, slide-in-left animations.

Light Mode tokens:
- --surface-page: #f9fafb (outer bg)
- --surface-base: #ffffff (card bg)
- --surface-raised: #f4f6f8 (table header, elevated)
- --surface-overlay: #ffffff (modal/dropdown)
- --border-default: #e5e7eb
- --border-strong: #d1d5db
- --text-primary: #111827
- --text-secondary: #374151
- --text-muted: #6b7280
- --text-disabled: #9ca3af
- --accent-primary: #2563eb
- --accent-hover: #1d4ed8
- --status-success: #16a34a
- --status-warning: #d97706
- --status-error: #dc2626
- --status-info: #0284c7

Dark Mode tokens (independently designed — NOT inverted):
- --surface-page: #0d1117
- --surface-base: #161b22
- --surface-raised: #1c2128
- --surface-overlay: #1c2128
- --border-default: #30363d
- --border-strong: #484f58
- --text-primary: #e6edf3
- --text-secondary: #8d96a0
- --text-muted: #6e7681
- --text-disabled: #484f58
- --accent-primary: #3b82f6
- --accent-hover: #60a5fa
- --status-success: #3fb950
- --status-warning: #d29922
- --status-error: #f85149
- --status-info: #58a6ff

Build the following UI primitives in pps/web/src/components/ui/:
- utton.tsx: variants (primary, secondary, ghost, destructive, outline), sizes (sm, md, lg), loading state with spinner, focus-visible ring, prefers-reduced-motion
- input.tsx: text/number/search/password, leading/trailing icon slots, error state, disabled state, focus ring
- adge.tsx: variants (default, success, warning, error, info, outline)
- card.tsx: Card + CardHeader + CardTitle + CardContent + CardFooter, elevation levels (flat, raised, floating)
- skeleton.tsx: line, block, circle, table-row variants; prefers-reduced-motion fallback
- empty-state.tsx: icon + title + description + optional CTA button
- data-table.tsx: sortable column headers, row hover, selected row state, loading skeleton overlay, empty state slot, responsive (scroll on tablet, stacked cards on mobile < sm), built-in pagination controls
- modal.tsx: standard modal + confirmation dialog, fade+scale animation (reduced-motion safe), converts to bottom-sheet on mobile < md, proper aria-modal/role=dialog/focus trap
- 	oast.tsx: success/error/warning/info variants, auto-dismiss with progress bar, stacking
- 	abs.tsx: consistent tab bar with underline-style active indicator
- select.tsx: styled native select wrapper, disabled/error states
- page-header.tsx: title + optional breadcrumb + action slot (buttons collapse to menu on mobile)
- index.ts: barrel export of all primitives

### R2. Navigation Redesign

Modify pps/web/src/components/sidebar.tsx:
- Remove border-l-2 active state → full-width pill background: bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]
- Group nav items with section labels:
  - OPERATIONS: Dashboard, POS Billing, Sales & Invoices, Sales Returns
  - INVENTORY: Medicines, Inventory & Batches, Purchases, Purchase Orders, Opening Stock
  - PEOPLE: Customers, Suppliers
  - FINANCE: Expenses, Reports & Analytics
  - MANAGEMENT: Settings
- Add sidebar collapse toggle button (chevron) that sets a new isSidebarCollapsed state in ui-store
- Collapsed: 56px wide, show only icons with tooltips; Expanded: 240px wide, show icons + labels
- User avatar section at bottom: colored initials circle + name + role chip
- All existing permission filtering logic stays

Modify pps/web/src/components/header.tsx:
- All icon buttons: uniform 36×36px touch target, rounded-lg, consistent hover bg
- Theme toggle: icon only (no text), add title tooltip
- Logout: keep as is but unify with button variant
- Notifications: show numeric badge count (not just dot)
- Branch selector: pill design, if multi-branch use popover/select
- SmartAutocomplete search in header stays connected to P1 search — DO NOT REMOVE

Create NEW pps/web/src/components/mobile-nav.tsx:
- Bottom navigation bar, fixed, only visible on < lg screens (hidden lg:hidden)
- 5 primary tabs: Dashboard (/), POS (/pos), Sales (/sales), Inventory (/inventory), More
- More opens a slide-up drawer listing remaining nav items
- Active tab: accent color icon + label
- iOS safe area: padding-bottom: env(safe-area-inset-bottom, 0)
- Respects hasPermission checks from useAuthStore

Modify pps/web/src/app/layout.tsx:
- Import and render MobileNav below main content
- Add pb-16 lg:pb-0 to the main content wrapper to prevent overlap
- Add isSidebarCollapsed to ui-store if not present (Zustand persist)

### R3. All Pages Redesigned (Visual Only — Zero Logic Changes)

For EVERY page listed below: keep all API calls, React Query hooks, form handlers, validation, state, mutations, routing EXACTLY as-is. Only change the JSX presentation layer. Use the new UI primitives.

**Dashboard** (pps/web/src/app/page.tsx):
- REMOVE import of SpatialMedicalCanvas and the component from JSX
- REMOVE framer-motion stagger animation (keep simple fade-in on mount max)
- Layout: 4 KPI tiles row (Today Sales, Revenue, Stock Value, Low Stock Alerts) → full-width sales trend Recharts chart → 2-col row (recent invoices DataTable + quick actions panel)
- KPI tile: large number, label, subtle trend arrow — no colored icon backgrounds
- Quick Actions: 4 buttons (Go to POS, New Purchase, Add Medicine, Reports) with clear hierarchy
- Use Skeleton for loading states

**Login** (pps/web/src/app/login/page.tsx):
- Desktop: two-column layout. Left panel (40%): brand color bg, store logo (from useBrandingStore), store name, tagline. Right panel (60%): centered login form.
- Mobile: single column, logo at top, then form
- Keep useBrandingStore reactive storeLogo connection from P2
- Email + password inputs with show/hide toggle for password
- Loading state: spinner in button, inputs disabled
- Error: inline message below form

**POS** (pps/web/src/app/pos/page.tsx):
- Visual refresh only: left medicine search/grid panel, right cart panel with clean item list, quantity controls, total summary
- All hotkeys, barcode scanner, print logic, payment processing stays completely unchanged
- Use new Button, Input, Badge primitives for visual consistency

**Sales** (pps/web/src/app/sales/page.tsx):
- PageHeader with title "Sales & Invoices" + action buttons
- Filter bar: date range, search, status filter
- DataTable with columns: Invoice#, Date, Customer, Items, Total, Status badge, Actions (WhatsApp icon, PDF icon, View icon)
- Keep all existing query logic, WhatsApp share (P2), PDF download

**Purchases** (pps/web/src/app/purchases/page.tsx):
- PageHeader + filter bar (date, supplier, status) + DataTable

**Purchase Orders** (pps/web/src/app/purchase-orders/page.tsx):
- PageHeader + status filter tabs (All/Pending/Received/Cancelled) + DataTable

**Medicines** (pps/web/src/app/medicines/page.tsx):
- PageHeader + search + DataTable
- Stock badge: success (in-stock), warning (low), error (out)

**Inventory** (pps/web/src/app/inventory/page.tsx):
- DataTable sortable by expiry date
- Expiry badge: error (expired), warning (< 90 days), success (ok)

**Customers** (pps/web/src/app/customers/page.tsx):
- PageHeader + search + DataTable

**Suppliers** (pps/web/src/app/suppliers/page.tsx):
- PageHeader + search + DataTable

**Expenses** (pps/web/src/app/expenses/page.tsx):
- PageHeader + category filter tabs + DataTable

**Sales Returns** (pps/web/src/app/sales-returns/page.tsx):
- PageHeader + DataTable with status badge
- Keep dynamic storeName WhatsApp logic from P2

**Reports** (pps/web/src/app/reports/page.tsx):
- Tabs for report types (Sales/Purchase/Inventory/Expenses)
- Chart containers using design tokens for colors

**Settings** (pps/web/src/app/settings/page.tsx):
- Two-column layout on desktop: left settings nav (General/Branding/Receipt/Branches/Users) + right content
- ALL P2 branding logic stays: uploadLogoMutation, color pickers, file size validation, instant preview

**Import** (pps/web/src/app/import/page.tsx):
- Professional file drop zone with dashed border, icon, description

### R4. Zero Functional Regression
No backend files, API endpoints, Prisma schema, NestJS modules, shared-utils logic, or business logic may change. After all changes:
- cd apps/api && npm run build must exit code 0
- cd apps/web && npm run build must exit code 0 with all 18 routes
- 
pm test from monorepo root must pass 100/100 tests
- All P1 search functionality works (SmartAutocomplete, command palette)
- All P2 branding works (logo upload, cache-busting, WhatsApp dynamic storeName)

---

## Acceptance Criteria

### Design System
- [ ] globals.css has 40+ semantic CSS variables for both :root and .dark; dark mode is independently designed (not inverted)
- [ ] 	ailwind.config.ts contains no glow-cyan, urora, pulse-ring, glass, or obsidian tokens; rand scale is retained
- [ ] All 13 UI primitives exist in components/ui/ with correct index.ts barrel exports

### Navigation
- [ ] Sidebar shows grouped nav items with section labels
- [ ] Sidebar collapse toggle works; collapsed = 56px icon-only with tooltips; expanded = 240px with labels
- [ ] MobileNav bottom bar renders on screens <lg with 5 tabs; More drawer opens remaining items
- [ ] Header has uniform button sizing; theme toggle is icon-only with tooltip

### Pages
- [ ] All 14 pages redesigned using PageHeader + DataTable + new primitives
- [ ] Dashboard has no SpatialMedicalCanvas import or framer-motion stagger
- [ ] Login has two-panel desktop layout and single-column mobile layout
- [ ] Light mode renders correctly on all pages (no raw sky-600/slate hardcoded where tokens apply)
- [ ] Dark mode is independently designed and renders correctly on all pages

### Functional Integrity
- [ ] cd apps/api && npm run build exits 0
- [ ] cd apps/web && npm run build exits 0, 18 routes present
- [ ] 
pm test from root: 100/100 pass
- [ ] useBrandingStore still drives sidebar logo, login logo, document title
- [ ] WhatsApp share on Sales page still uses dynamic storeName from P2
- [ ] Logo upload in Settings still updates branding immediately
- [ ] Ctrl+K command palette still opens global search (P1)
- [ ] SmartAutocomplete in header still works (P1)
