import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function runM2Challenger2EmpiricalTests() {
  describe('🔬 CHALLENGER 2: Milestone 2 (Auth, Dashboard & POS Hub) Adversarial Empirical Verification', () => {
    const rootDir = path.resolve(__dirname, '..');
    const loginPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'login', 'page.tsx');
    const dashboardPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'page.tsx');
    const posPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'pos', 'page.tsx');
    const globalsCssPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'globals.css');
    const tailwindConfigPath = path.join(rootDir, 'apps', 'web', 'tailwind.config.ts');

    // =========================================================================
    // SECTION 1: LOGIN PAGE EMPIRICAL AUDIT (R3)
    // =========================================================================
    describe('1. Login Page Architecture & Responsiveness (apps/web/src/app/login/page.tsx)', () => {
      it('CHALLENGE-LOG-1: Validates two-column desktop (40/60) & single-column mobile structure', () => {
        assert.ok(fs.existsSync(loginPath), 'login/page.tsx must exist on disk');
        const src = fs.readFileSync(loginPath, 'utf8');

        // Responsive grid/flex verification
        assert.ok(src.includes('flex flex-col md:flex-row'), 'Outer container must use flex-col on mobile and flex-row on desktop');
        assert.ok(src.includes('hidden md:flex md:w-[40%]'), 'Left branding panel must be hidden on mobile and flex with 40% width on md+');
        assert.ok(src.includes('w-full md:w-[60%]'), 'Right form panel must be full-width on mobile and 60% on md+');
        assert.ok(src.includes('md:hidden text-center'), 'Mobile-only brand header must be present for <md viewports');
      });

      it('CHALLENGE-LOG-2: Password toggle accessibility, icons, and input type switching', () => {
        const src = fs.readFileSync(loginPath, 'utf8');

        assert.ok(src.includes('const [showPassword, setShowPassword] = useState(false)'), 'showPassword state initialized to false');
        assert.ok(src.includes("type={showPassword ? 'text' : 'password'}"), 'Password input type switches between text and password');
        assert.ok(src.includes('<EyeOff') && src.includes('<Eye'), 'Both Eye and EyeOff lucide icons imported and used');
        assert.ok(src.includes('aria-label='), 'Password toggle button includes aria-label for accessibility');
        assert.ok(src.includes('tabIndex={-1}'), 'Password toggle button avoids disrupting tab flow');
      });

      it('CHALLENGE-LOG-3: Primitives, loading disabled states, and error handling', () => {
        const src = fs.readFileSync(loginPath, 'utf8');

        // UI Primitives
        assert.ok(src.includes("import { Input, Button } from '../../components/ui'"), 'Imports Input and Button from components/ui');
        assert.ok(src.includes('<Input'), 'Renders Input primitive for credentials');
        assert.ok(src.includes('<Button'), 'Renders Button primitive for form submission');

        // Loading & disabled state
        assert.ok(src.includes('disabled={loading}'), 'Inputs and buttons disabled during async auth requests');
        assert.ok(src.includes('isLoading={loading}'), 'Button displays loading spinner state during login');

        // Inline error banner
        assert.ok(src.includes('errorMessage &&'), 'Conditional error banner rendering');
        assert.ok(src.includes('text-status-error'), 'Error banner uses text-status-error semantic token');
        assert.ok(src.includes('bg-status-error-bg'), 'Error banner uses bg-status-error-bg semantic token');
        assert.ok(src.includes('border-status-error-border'), 'Error banner uses border-status-error-border semantic token');
      });

      it('CHALLENGE-LOG-4: P2 Branding & Auth integration invariants', () => {
        const src = fs.readFileSync(loginPath, 'utf8');

        assert.ok(src.includes('useBrandingStore()'), 'Connects reactively to useBrandingStore');
        assert.ok(src.includes('storeLogo'), 'Binds reactive storeLogo in both desktop and mobile panels');
        assert.ok(src.includes('storeName'), 'Binds reactive storeName with fallback');
        assert.ok(src.includes('useAuthStore'), 'Connects to useAuthStore');
        assert.ok(src.includes('loginStore(accessToken, refreshToken, user)'), 'Dispatches tokens and user to auth store');
        assert.ok(src.includes("router.push('/')"), 'Navigates to dashboard on successful login');
      });
    });

    // =========================================================================
    // SECTION 2: DASHBOARD PAGE EMPIRICAL AUDIT (R2)
    // =========================================================================
    describe('2. Dashboard Layout, Metrics & Token Styling (apps/web/src/app/page.tsx)', () => {
      it('CHALLENGE-DASH-1: Zero residual 3D canvas or framer-motion stagger variants', () => {
        assert.ok(fs.existsSync(dashboardPath), 'apps/web/src/app/page.tsx must exist');
        const src = fs.readFileSync(dashboardPath, 'utf8');

        assert.ok(!src.includes('SpatialMedicalCanvas'), 'SpatialMedicalCanvas component must be completely removed');
        assert.ok(!src.includes('spatial-canvas'), 'No imports from spatial-canvas allowed');
        assert.ok(!src.includes('containerVariants'), 'framer-motion containerVariants must be removed');
        assert.ok(!src.includes('itemVariants'), 'framer-motion itemVariants must be removed');
        assert.ok(!src.includes('framer-motion'), 'framer-motion imports not present on dashboard page');
        assert.ok(src.includes('animate-fade-in'), 'Uses lightweight CSS animate-fade-in for instant transition');
      });

      it('CHALLENGE-DASH-2: Row 1 - 4 Compact KPI Tiles responsive grid (2-col mobile, 4-col desktop)', () => {
        const src = fs.readFileSync(dashboardPath, 'utf8');

        assert.ok(src.includes('grid grid-cols-2 lg:grid-cols-4 gap-4'), 'KPI grid must be 2 cols on mobile and 4 cols on lg+ screens');
        assert.ok(src.includes("Today's Sales"), 'Tile 1: Today Sales KPI');
        assert.ok(src.includes('Net Revenue (Est.)') || src.includes('Net Revenue'), 'Tile 2: Net Revenue KPI');
        assert.ok(src.includes('Stock Value'), 'Tile 3: Stock Value KPI');
        assert.ok(src.includes('Low-Stock Alerts'), 'Tile 4: Low-Stock Alerts KPI');
        assert.ok(src.includes('text-2xl font-bold'), 'KPI numbers styled with text-2xl font-bold');
        assert.ok(src.includes('Skeleton'), 'Skeleton loading state for KPI tiles');
      });

      it('CHALLENGE-DASH-3: Row 2 - Full-Width Recharts LineChart with CSS design tokens', () => {
        const src = fs.readFileSync(dashboardPath, 'utf8');

        assert.ok(src.includes('<ResponsiveContainer'), 'ResponsiveContainer ensures full width');
        assert.ok(src.includes('<LineChart'), 'LineChart component instantiated');
        assert.ok(src.includes('var(--border-default)'), 'Gridlines and axes bound to var(--border-default)');
        assert.ok(src.includes('var(--accent-primary)'), 'Line stroke and dots bound to var(--accent-primary)');
        assert.ok(src.includes('var(--surface-overlay)'), 'Tooltip background bound to var(--surface-overlay)');
        assert.ok(src.includes('var(--text-primary)'), 'Tooltip text bound to var(--text-primary)');
      });

      it('CHALLENGE-DASH-4: Row 3 - 2-Column Grid (Recent Invoices DataTable + Quick Actions)', () => {
        const src = fs.readFileSync(dashboardPath, 'utf8');

        assert.ok(src.includes('grid grid-cols-1 lg:grid-cols-3 gap-6'), 'Row 3 must use 1-col mobile and 3-col desktop layout');
        assert.ok(src.includes('lg:col-span-2'), 'Recent Invoices spans 2 columns on desktop');
        assert.ok(src.includes('<DataTable'), 'Recent Invoices rendered using DataTable primitive');
        assert.ok(src.includes('invoiceColumns'), 'invoiceColumns defined with typed Column<any> array');
        assert.ok(src.includes('Quick Actions'), 'Quick Actions panel present');
        assert.ok(src.includes('href="/pos"'), 'Action 1: Go to POS Counter');
        assert.ok(src.includes('href="/purchases"'), 'Action 2: New Purchase / Inward');
        assert.ok(src.includes('href="/medicines"'), 'Action 3: Add / Manage Medicine');
        assert.ok(src.includes('href="/reports"'), 'Action 4: View Financial Reports');
      });

      it('CHALLENGE-DASH-5: Shell and mobile bottom navigation clearance', () => {
        const src = fs.readFileSync(dashboardPath, 'utf8');

        assert.ok(src.includes('<Sidebar'), 'Renders redesigned Sidebar');
        assert.ok(src.includes('<Header'), 'Renders redesigned Header');
        assert.ok(src.includes('pb-16 lg:pb-0'), 'Main container includes pb-16 lg:pb-0 for mobile bottom navigation clearance');
      });
    });

    // =========================================================================
    // SECTION 3: POS PAGE LOGIC PRESERVATION EMPIRICAL AUDIT (R4)
    // =========================================================================
    describe('3. POS Hub Business Logic & Token Styling (apps/web/src/app/pos/page.tsx)', () => {
      it('CHALLENGE-POS-1: Preserves keyboard shortcuts and hotkeys without regression', () => {
        assert.ok(fs.existsSync(posPath), 'pos/page.tsx must exist');
        const src = fs.readFileSync(posPath, 'utf8');

        assert.ok(src.includes("e.key === 'F1'"), 'F1: Focus search input');
        assert.ok(src.includes("e.key === 'F2'"), 'F2: Customer modal');
        assert.ok(src.includes("e.key === 'F4'"), 'F4: Reprint last bill');
        assert.ok(src.includes("e.key === 'F8'"), 'F8: Held carts');
        assert.ok(src.includes("e.key === 'F9'"), 'F9: Checkout payment');
        assert.ok(src.includes("e.key === '+'") || src.includes("e.key === '='"), '+/= : Increment item quantity');
        assert.ok(src.includes("e.key === '-'"), '- : Decrement item quantity');
        assert.ok(src.includes("e.key === 'Delete'"), 'Delete: Remove item from cart');
        assert.ok(src.includes("e.key === 'Escape'"), 'Escape: Close active modal');
      });

      it('CHALLENGE-POS-2: Preserves hardware & camera barcode scanner workflows', () => {
        const src = fs.readFileSync(posPath, 'utf8');

        assert.ok(src.includes('handleBarcodeScan'), 'Hardware barcode scanner listener preserved');
        assert.ok(src.includes('handleDirectCodeScan'), 'Direct barcode code query resolver preserved');
        assert.ok(src.includes('CameraBarcodeScanner'), 'Mobile CameraBarcodeScanner component preserved');
        assert.ok(src.includes('showCameraScanner'), 'showCameraScanner state toggle preserved');
      });

      it('CHALLENGE-POS-3: Multi-unit levels (Tablet, Strip, Box) and FEFO batch selection', () => {
        const src = fs.readFileSync(posPath, 'utf8');

        assert.ok(src.includes('TABLET'), 'TABLET unit level supported');
        assert.ok(src.includes('STRIP'), 'STRIP unit level supported');
        assert.ok(src.includes('BOX'), 'BOX unit level supported');
        assert.ok(src.includes('fefoBatch'), 'FEFO automated batch prioritization preserved');
        assert.ok(src.includes('switchItemBatch'), 'Manual batch override switcher preserved');
      });

      it('CHALLENGE-POS-4: Preserves all 8 critical operational modals', () => {
        const src = fs.readFileSync(posPath, 'utf8');

        assert.ok(src.includes('batchModalItem'), 'Modal 1: Batch selection modal');
        assert.ok(src.includes('showShiftModal'), 'Modal 2: Cashier shift manager modal');
        assert.ok(src.includes('showHeldModal'), 'Modal 3: Held carts modal');
        assert.ok(src.includes('showSplitPaymentModal'), 'Modal 4: Multi-tender split payment modal');
        assert.ok(src.includes('showCustomerModal'), 'Modal 5: Quick add customer modal');
        assert.ok(src.includes('showReturnModal'), 'Modal 6: Sales return & refund modal');
        assert.ok(src.includes('showRxModal'), 'Modal 7: Schedule H prescription capture modal');
        assert.ok(src.includes('ThermalReceiptPreview'), 'Modal 8: Thermal receipt preview');
      });

      it('CHALLENGE-POS-5: Preserves P2 WhatsApp and Receipt Print integrations', () => {
        const src = fs.readFileSync(posPath, 'utf8');

        assert.ok(src.includes('shareInvoiceViaWhatsApp'), 'P2 WhatsApp sharing hook call preserved');
        assert.ok(src.includes('ThermalReceiptPreview'), 'P2 ThermalReceiptPreview component preserved');
        assert.ok(src.includes('handleLastBillReprint'), 'Thermal receipt reprint routine preserved');
        assert.ok(src.includes('completedReceiptData'), 'Receipt modal data binding preserved');
        assert.ok(src.includes('pb-16 lg:pb-0'), 'POS main view includes pb-16 lg:pb-0 for mobile nav clearance');
      });
    });

    // =========================================================================
    // SECTION 4: DESIGN TOKENS & CSS VARIABLE CONFORMANCE
    // =========================================================================
    describe('4. Semantic Token System Conformance (globals.css & tailwind.config.ts)', () => {
      it('CHALLENGE-TOKENS-1: globals.css defines complete semantic token set for light & dark mode', () => {
        assert.ok(fs.existsSync(globalsCssPath), 'globals.css must exist');
        const css = fs.readFileSync(globalsCssPath, 'utf8');

        // Light mode tokens
        assert.ok(css.includes('--surface-page:'), 'Defines --surface-page');
        assert.ok(css.includes('--surface-base:'), 'Defines --surface-base');
        assert.ok(css.includes('--surface-raised:'), 'Defines --surface-raised');
        assert.ok(css.includes('--surface-overlay:'), 'Defines --surface-overlay');
        assert.ok(css.includes('--border-default:'), 'Defines --border-default');
        assert.ok(css.includes('--text-primary:'), 'Defines --text-primary');
        assert.ok(css.includes('--text-secondary:'), 'Defines --text-secondary');
        assert.ok(css.includes('--text-muted:'), 'Defines --text-muted');
        assert.ok(css.includes('--accent-primary:'), 'Defines --accent-primary');
        assert.ok(css.includes('--status-success:'), 'Defines --status-success');
        assert.ok(css.includes('--status-warning:'), 'Defines --status-warning');
        assert.ok(css.includes('--status-error:'), 'Defines --status-error');

        // Dark mode overrides
        assert.ok(css.includes('.dark {'), 'Defines .dark mode selector');
        assert.ok(css.includes('--surface-page: #0d1117'), 'Dark mode --surface-page');
        assert.ok(css.includes('--surface-base: #161b22'), 'Dark mode --surface-base');
        assert.ok(css.includes('--accent-primary: #3b82f6'), 'Dark mode --accent-primary');
      });

      it('CHALLENGE-TOKENS-2: tailwind.config.ts maps all semantic colors to CSS variables', () => {
        assert.ok(fs.existsSync(tailwindConfigPath), 'tailwind.config.ts must exist');
        const config = fs.readFileSync(tailwindConfigPath, 'utf8');

        assert.ok(config.includes("page: 'var(--surface-page)'"), 'Maps surface.page to var(--surface-page)');
        assert.ok(config.includes("base: 'var(--surface-base)'"), 'Maps surface.base to var(--surface-base)');
        assert.ok(config.includes("primary: 'var(--text-primary)'"), 'Maps text.primary to var(--text-primary)');
        assert.ok(config.includes("primary: 'var(--accent-primary)'"), 'Maps accent.primary to var(--accent-primary)');
        assert.ok(config.includes("success: 'var(--status-success)'"), 'Maps status.success to var(--status-success)');
        assert.ok(config.includes("warning: 'var(--status-warning)'"), 'Maps status.warning to var(--status-warning)');
        assert.ok(config.includes("error: 'var(--status-error)'"), 'Maps status.error to var(--status-error)');
      });
    });
  });
}
