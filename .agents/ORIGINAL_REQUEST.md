# Original User Request

## 2026-08-22T13:21:11Z

Continue and complete the P3 UI/UX redesign of the Medical Inventory ERP. The design system foundation (M1) is already complete on disk. This task covers only the REMAINING work: Navigation redesign, all 14 page redesigns, and final build verification.

Working directory: d:\antigravity programme\medical_inventory
Integrity mode: development

---

## WHAT IS ALREADY DONE — DO NOT REDO

### M1 Complete (already on disk — verified):
- `apps/web/src/app/globals.css` — 40+ semantic CSS tokens written for both light + dark mode
- `apps/web/tailwind.config.ts` — Updated with CSS-variable-driven semantic colors (surface, border, text, accent, status tokens)
- `apps/web/src/components/ui/badge.tsx` — Done
- `apps/web/src/components/ui/button.tsx` — Done
- `apps/web/src/components/ui/card.tsx` — Done
- `apps/web/src/components/ui/data-table.tsx` — Done
- `apps/web/src/components/ui/empty-state.tsx` — Done
- `apps/web/src/components/ui/input.tsx` — Done
- `apps/web/src/components/ui/modal.tsx` — Done
- `apps/web/src/components/ui/page-header.tsx` — Done
- `apps/web/src/components/ui/select.tsx` — Done
- `apps/web/src/components/ui/skeleton.tsx` — Done
- `apps/web/src/components/ui/tabs.tsx` — Done
- `apps/web/src/components/ui/toast.tsx` — Done
- `apps/web/src/components/ui/index.ts` — Done (barrel exports)

Do NOT modify any of the above files unless fixing a build error caused by something you change.

---

## CRITICAL PROTECTION — DO NOT TOUCH THESE (P1 + P2 work)

### P1 Search System (Day 1 — fully working):
- `apps/web/src/components/ui/smart-autocomplete.tsx` — DO NOT MODIFY
- `apps/web/src/components/global-command-palette.tsx` — DO NOT MODIFY
- `apps/api/src/modules/search/` — DO NOT MODIFY
- The SmartAutocomplete in header.tsx must stay connected and working

### P2 Branding System (Day 2 — fully working):
- `apps/web/src/stores/branding-store.ts` — DO NOT MODIFY
- `apps/web/src/lib/whatsapp-share.ts` — DO NOT MODIFY
- `apps/api/src/modules/settings/` — DO NOT MODIFY
- `packages/shared-utils/src/whatsapp.ts` — DO NOT MODIFY
- `apps/web/src/components/thermal-receipt-preview.tsx` — DO NOT MODIFY
- In all pages: preserve all useBrandingStore hooks, uploadLogoMutation, shareInvoiceViaWhatsApp calls

---

## DESIGN SYSTEM REFERENCE (for using tokens in new code)

The globals.css tokens to use in JSX (via Tailwind classes from tailwind.config.ts):

**Surfaces**: `bg-surface-page`, `bg-surface-base`, `bg-surface-raised`, `bg-surface-overlay`
**Borders**: `border-border-default`, `border-border-strong`, `border-border-subtle`
**Text**: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-disabled`
**Accent**: `text-accent-primary`, `bg-accent-primary`, `hover:bg-accent-hover`
**Status**: `text-status-success`, `text-status-warning`, `text-status-error`, `text-status-info`

Always read the actual `globals.css` and `tailwind.config.ts` files to see exact token names before writing any page code.

---

## REMAINING REQUIREMENTS

### R1. Navigation Redesign

Modify `apps/web/src/components/sidebar.tsx`:
- Keep ALL existing imports, permission logic (hasPermission checks), useBrandingStore, useAuthStore, useUiStore — only change JSX presentation
- Group nav items with visual section labels:
  - OPERATIONS: Dashboard, POS Billing, Sales & Invoices, Sales Returns
  - INVENTORY: Medicines, Inventory & Batches, Purchases, Purchase Orders, Opening Stock / Import
  - PEOPLE: Customers, Suppliers
  - FINANCE: Expenses, Reports & Analytics
  - MANAGEMENT: Settings
- Replace `border-l-2` active state with full-width pill: accent background + accent text
- Add collapsible mode: a toggle button (ChevronLeft/ChevronRight icon) that collapses sidebar to 56px icon-only width; expanded = 240px with labels. Persist collapse state in useUiStore (add `isSidebarCollapsed: boolean` and `toggleSidebarCollapsed: () => void` to ui-store if not present).
- When collapsed: show only icons, show tooltip on hover with item label
- User section at bottom: colored initials avatar + name + role chip (role uses accent color)
- Mobile drawer behavior: unchanged (keep existing isMobileSidebarOpen / closeMobileSidebar logic)

Modify `apps/web/src/components/header.tsx`:
- Keep ALL existing logic: logout, branch selector, theme toggle, fullscreen, notifications query, SmartAutocomplete search
- Make all icon buttons uniform: same size (36px touch target), rounded-lg, same hover background
- Theme toggle: icon only (remove text label), add `title` tooltip
- Notifications: show numeric count badge (not just a dot) when unreadCount > 0
- Branch selector: clean pill design; if only 1 branch show as text, if multi-branch keep select
- Keep SmartAutocomplete exactly as is — just restyle its container if needed

Create NEW file `apps/web/src/components/mobile-nav.tsx`:
- Bottom navigation bar, `fixed bottom-0 left-0 right-0`, only visible on `< lg` screens (`lg:hidden`)
- 5 primary tabs: Dashboard (/), POS (/pos), Sales (/sales), Inventory (/inventory), More
- Active tab: accent color icon + accent colored label text
- "More" tab: opens a slide-up drawer listing all remaining nav items that user has permission to see
- iOS safe-area: `padding-bottom: env(safe-area-inset-bottom, 0px)` via inline style or Tailwind `pb-safe`
- Use `usePathname` for active state, `useAuthStore` for `hasPermission` checks
- Height: 56px + safe area
- Background: `bg-surface-base border-t border-border-default`

Modify `apps/web/src/app/layout.tsx`:
- Import and render `<MobileNav />` below the main content area
- Add `pb-16 lg:pb-0` (or `pb-14`) to the scrollable main content wrapper to prevent content being hidden behind bottom nav
- Read the existing layout.tsx first to understand current structure before modifying

### R2. Dashboard Redesign

Modify `apps/web/src/app/page.tsx`:
- REMOVE import of `SpatialMedicalCanvas` from `'../components/spatial-canvas'` and remove the component from JSX
- REMOVE `framer-motion` stagger container/item variants — replace with a simple CSS fade-in class (`animate-fade-in`) on the main wrapper
- Keep ALL existing: useAuthStore, useQuery for dashboard-summary, useRouter redirect, formatCurrency import
- New layout structure:
  - Row 1: 4 compact KPI tiles in a grid (2-col on mobile, 4-col on desktop): Today's Sales, Net Revenue, Stock Value, Low-Stock Alerts. Each tile: large number (text-2xl font-bold), small label (text-sm text-text-muted), subtle trend arrow. No large colored icon backgrounds.
  - Row 2: Full-width sales trend Recharts LineChart (keep existing Recharts import, just restyle with design tokens: gridline color `var(--border-default)`, line color `var(--accent-primary)`, tooltip bg `var(--surface-overlay)`)
  - Row 3: 2-column grid: left = Recent Invoices (use DataTable primitive from components/ui), right = Quick Actions panel (4 buttons: Go to POS, New Purchase, Add Medicine, View Reports using Link + Button primitives)
- Use Skeleton primitive from `components/ui` for loading states
- Empty state: show EmptyState primitive from `components/ui` if no data

### R3. Login Page Redesign

Modify `apps/web/src/app/login/page.tsx`:
- Keep ALL existing logic: form state, API call, error handling, router.push, useBrandingStore reactive storeLogo/storeName
- Desktop layout (md+): two-column. Left panel (40% width): accent primary bg, centered store logo (from useBrandingStore), store name, tagline "Medical ERP & POS". Right panel (60%): white/surface bg, centered login form.
- Mobile layout (<md): single column, logo centered at top, then form below
- Form: Email input + Password input with show/hide toggle (Eye/EyeOff lucide icon)
- Loading state: spinner inside submit button, all inputs disabled
- Error: inline error message below the form fields
- Use Input and Button primitives from `components/ui`

### R4. POS Page Visual Refresh

Modify `apps/web/src/app/pos/page.tsx`:
- THIS IS THE MOST CRITICAL PAGE — preserve ALL business logic without exception:
  - All keyboard shortcuts/hotkeys
  - Barcode scanner integration (`camera-barcode-scanner`)
  - Cart state management
  - Payment processing
  - Print/receipt logic
  - All API calls
  - All mutations
- Only change: Apply design tokens (replace hardcoded sky-600/slate colors with token classes), use Button/Input primitives for visual consistency
- Read the full file before touching anything

### R5. All Inner Pages Redesigned (Visual Only)

For each page below: keep ALL API calls, React Query hooks, form handlers, validation, mutations, routing EXACTLY as-is. Only change JSX presentation. Use PageHeader + DataTable + new UI primitives.

Apply this pattern to every page:
1. `PageHeader` at top (from `components/ui/page-header`) with page title and action buttons
2. Filter bar below header (search input + status/category filter tabs or dropdowns)
3. `DataTable` (from `components/ui/data-table`) replacing any ad-hoc table markup
4. Use `Badge` for status indicators, `Skeleton` for loading, `EmptyState` for empty lists
5. All action buttons (edit, delete, view, WhatsApp, PDF) become icon-button groups per row

Pages to redesign:
- `apps/web/src/app/sales/page.tsx` — PageHeader "Sales & Invoices" + date/search/status filters + DataTable. Keep shareInvoiceViaWhatsApp (P2). Keep PDF download.
- `apps/web/src/app/purchases/page.tsx` — PageHeader + supplier/date/status filters + DataTable
- `apps/web/src/app/purchase-orders/page.tsx` — PageHeader + status tabs (All/Pending/Received/Cancelled) + DataTable
- `apps/web/src/app/medicines/page.tsx` — PageHeader + search + DataTable. Stock Badge: success=in-stock, warning=low, error=out.
- `apps/web/src/app/inventory/page.tsx` — DataTable sortable by expiry. Expiry Badge: error=expired, warning=<90 days, success=ok.
- `apps/web/src/app/customers/page.tsx` — PageHeader + search + DataTable
- `apps/web/src/app/suppliers/page.tsx` — PageHeader + search + DataTable
- `apps/web/src/app/expenses/page.tsx` — PageHeader + category filter tabs + DataTable
- `apps/web/src/app/sales-returns/page.tsx` — PageHeader + DataTable + status badge. Keep P2 dynamic storeName WhatsApp.
- `apps/web/src/app/reports/page.tsx` — Report type Tabs + chart containers using design token colors
- `apps/web/src/app/settings/page.tsx` — Two-column layout desktop (left nav: General/Branding/Receipt/Branches/Users tabs, right: content). Keep ALL P2 branding: uploadLogoMutation, color pickers, file validation, logo preview. Keep ALL settings forms intact.
- `apps/web/src/app/import/page.tsx` — Professional dashed-border file drop zone, icon + description + CTA

### R6. Zero Functional Regression + Build Verification

After all changes, run and verify:
```bash
cd apps/api && npm run build
cd apps/web && npm run build
npm test
```

All three must succeed. If build fails, fix TypeScript/import errors. Do NOT change any backend files to fix build errors — only fix frontend import paths or type annotations.

---

## Acceptance Criteria

### Navigation
- [ ] sidebar.tsx: nav items grouped under section labels (OPERATIONS, INVENTORY, PEOPLE, FINANCE, MANAGEMENT)
- [ ] sidebar.tsx: collapse toggle works; icon-only at 56px, labels visible at 240px
- [ ] sidebar.tsx: active item uses accent background pill, not border-l-2
- [ ] header.tsx: all icon buttons have uniform size and hover behavior; theme toggle has no text label
- [ ] mobile-nav.tsx: new file exists, renders bottom bar on <lg, 5 tabs + More drawer, iOS safe area
- [ ] layout.tsx: MobileNav imported and rendered; main content has bottom padding to avoid overlap

### Pages
- [ ] Dashboard: SpatialMedicalCanvas removed; framer-motion stagger removed; 4 KPI tiles + chart + recent invoices + quick actions layout
- [ ] Login: two-panel desktop layout; single column mobile; password show/hide toggle; reactive storeLogo from P2 still connected
- [ ] All 10 inner pages (sales/purchases/purchase-orders/medicines/inventory/customers/suppliers/expenses/sales-returns/reports/settings/import): use PageHeader + DataTable + Badge + Skeleton + EmptyState primitives
- [ ] Settings page: ALL P2 branding logic intact (logo upload, color pickers, uploadLogoMutation)
- [ ] Sales/sales-returns: WhatsApp share still uses dynamic storeName from P2

### Build
- [ ] `cd apps/api && npm run build` exits 0
- [ ] `cd apps/web && npm run build` exits 0, 18 routes present
- [ ] `npm test` from root: 100/100 pass
- [ ] No TypeScript errors in any modified file
- [ ] SmartAutocomplete (P1) still imported and working in header
- [ ] useBrandingStore (P2) still connected in sidebar, login, and settings
