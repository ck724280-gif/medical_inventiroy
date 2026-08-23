import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

export function runM2AuthDashboardPosTests() {
  describe('🔬 Milestone 2: Auth, Dashboard & POS Hub Verification Suite', () => {
    const rootDir = path.resolve(__dirname, '..');
    const loginPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'login', 'page.tsx');
    const dashboardPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'page.tsx');
    const posPath = path.join(rootDir, 'apps', 'web', 'src', 'app', 'pos', 'page.tsx');

    describe('1. Login Page Redesign (apps/web/src/app/login/page.tsx)', () => {
      it('M2-LOGIN-1: file exists and has genuine content', () => {
        assert.ok(fs.existsSync(loginPath), 'login/page.tsx must exist');
        const content = fs.readFileSync(loginPath, 'utf8');
        assert.ok(content.length > 500, 'login/page.tsx must have substantial content');
      });

      it('M2-LOGIN-2: desktop 40/60 two-column layout and mobile single-column present', () => {
        const content = fs.readFileSync(loginPath, 'utf8');
        assert.ok(
          content.includes('md:w-[40%]') || content.includes('md:w-2/5') || content.includes('md:grid-cols'),
          'Desktop left panel must occupy 40% width'
        );
        assert.ok(
          content.includes('md:w-[60%]') || content.includes('md:w-3/5') || content.includes('md:col-span'),
          'Desktop right form panel must occupy 60% width'
        );
        assert.ok(content.includes('md:hidden'), 'Mobile single-column branding must be present');
      });

      it('M2-LOGIN-3: password show/hide toggle with Eye/EyeOff icons present', () => {
        const content = fs.readFileSync(loginPath, 'utf8');
        assert.ok(content.includes('showPassword'), 'Must contain showPassword state');
        assert.ok(content.includes('Eye') && content.includes('EyeOff'), 'Must contain Eye/EyeOff toggle icons');
        assert.ok(content.includes("showPassword ? 'text' : 'password'"), 'Must toggle password input type');
      });

      it('M2-LOGIN-4: UI primitives (Input, Button) used with loading and inline error', () => {
        const content = fs.readFileSync(loginPath, 'utf8');
        assert.ok(content.includes('<Input') || content.includes('Input'), 'Must use Input primitive');
        assert.ok(content.includes('<Button') || content.includes('Button'), 'Must use Button primitive');
        assert.ok(content.includes('isLoading={loading}'), 'Must pass isLoading to submit Button');
        assert.ok(content.includes('errorMessage'), 'Must render inline error message');
      });

      it('M2-LOGIN-5: connects to useBrandingStore, useAuthStore, loginSchema, and apiClient', () => {
        const content = fs.readFileSync(loginPath, 'utf8');
        assert.ok(content.includes('useBrandingStore'), 'Must use reactive branding store');
        assert.ok(content.includes('useAuthStore'), 'Must use auth store login action');
        assert.ok(content.includes('loginSchema'), 'Must use Zod loginSchema validation');
        assert.ok(content.includes("apiClient.post('/auth/login'"), 'Must execute login API request');
      });
    });

    describe('2. Dashboard Redesign (apps/web/src/app/page.tsx)', () => {
      it('M2-DASH-1: SpatialMedicalCanvas and framer-motion stagger variants removed', () => {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        assert.ok(!content.includes('SpatialMedicalCanvas'), 'SpatialMedicalCanvas must be removed');
        assert.ok(!content.includes('spatial-canvas'), 'spatial-canvas import must be removed');
        assert.ok(!content.includes('containerVariants'), 'framer-motion containerVariants must be removed');
        assert.ok(!content.includes('itemVariants'), 'framer-motion itemVariants must be removed');
      });

      it('M2-DASH-2: 4 compact KPI tiles grid configured with tokens', () => {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        assert.ok(
          content.includes('grid-cols-2') && content.includes('lg:grid-cols-4'),
          'KPI tiles must be in 2-col mobile, 4-col desktop grid'
        );
        assert.ok(content.includes("Today's Sales"), "Must contain Today's Sales tile");
        assert.ok(content.includes('Net Revenue'), 'Must contain Net Revenue / Gross Profit tile');
        assert.ok(content.includes('Stock Value'), 'Must contain Stock Value tile');
        assert.ok(content.includes('Low-Stock Alerts'), 'Must contain Low-Stock Alerts tile');
      });

      it('M2-DASH-3: full-width sales trend LineChart with design token styling', () => {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        assert.ok(content.includes('<LineChart'), 'Must contain Recharts LineChart');
        assert.ok(content.includes('var(--border-default)'), 'Must use --border-default for chart grid');
        assert.ok(content.includes('var(--accent-primary)'), 'Must use --accent-primary for chart line');
      });

      it('M2-DASH-4: Recent Invoices DataTable and Quick Actions panel present', () => {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        assert.ok(content.includes('<DataTable'), 'Must use DataTable primitive for Recent Invoices');
        assert.ok(content.includes('Quick Actions'), 'Must contain Quick Actions panel');
        assert.ok(content.includes('href="/pos"'), 'Must link to POS counter');
        assert.ok(content.includes('href="/purchases"'), 'Must link to purchases');
        assert.ok(content.includes('href="/medicines"'), 'Must link to medicines');
        assert.ok(content.includes('href="/reports"'), 'Must link to reports');
      });

      it('M2-DASH-5: mobile bottom nav safe padding present', () => {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        assert.ok(content.includes('pb-16 lg:pb-0'), 'Must contain pb-16 lg:pb-0 to avoid mobile nav overlap');
      });
    });

    describe('3. POS Billing Visual Refresh (apps/web/src/app/pos/page.tsx)', () => {
      it('M2-POS-1: preserves all keyboard shortcuts without exception', () => {
        const content = fs.readFileSync(posPath, 'utf8');
        assert.ok(content.includes("e.key === 'F1'"), 'F1 hotkey must be preserved');
        assert.ok(content.includes("e.key === 'F2'"), 'F2 hotkey must be preserved');
        assert.ok(content.includes("e.key === 'F4'"), 'F4 hotkey must be preserved');
        assert.ok(content.includes("e.key === 'F8'"), 'F8 hotkey must be preserved');
        assert.ok(content.includes("e.key === 'F9'"), 'F9 hotkey must be preserved');
        assert.ok(content.includes("e.key === '+'"), '+ hotkey must be preserved');
        assert.ok(content.includes("e.key === '-'"), '- hotkey must be preserved');
        assert.ok(content.includes("e.key === 'Delete'"), 'Delete hotkey must be preserved');
        assert.ok(content.includes("e.key === 'Escape'"), 'Escape hotkey must be preserved');
      });

      it('M2-POS-2: preserves hardware and mobile camera barcode scanning', () => {
        const content = fs.readFileSync(posPath, 'utf8');
        assert.ok(content.includes('handleBarcodeScan'), 'handleBarcodeScan must be preserved');
        assert.ok(content.includes('handleDirectCodeScan'), 'handleDirectCodeScan must be preserved');
        assert.ok(content.includes('<CameraBarcodeScanner'), 'CameraBarcodeScanner must be preserved');
      });

      it('M2-POS-3: preserves multi-unit levels, batch selection, FEFO pricing', () => {
        const content = fs.readFileSync(posPath, 'utf8');
        assert.ok(content.includes('TABLET'), 'TABLET unit must be supported');
        assert.ok(content.includes('STRIP'), 'STRIP unit must be supported');
        assert.ok(content.includes('BOX'), 'BOX unit must be supported');
        assert.ok(content.includes('switchItemBatch'), 'Batch switching must be preserved');
        assert.ok(content.includes('fefoBatch'), 'FEFO batch resolution must be preserved');
      });

      it('M2-POS-4: preserves all 8 POS workflows and modals', () => {
        const content = fs.readFileSync(posPath, 'utf8');
        assert.ok(content.includes('batchModalItem'), 'Batch modal must be preserved');
        assert.ok(content.includes('showShiftModal'), 'Shift modal must be preserved');
        assert.ok(content.includes('showHeldModal'), 'Held carts modal must be preserved');
        assert.ok(content.includes('showSplitPaymentModal'), 'Split payment modal must be preserved');
        assert.ok(content.includes('showCustomerModal'), 'Customer modal must be preserved');
        assert.ok(content.includes('showReturnModal'), 'Return modal must be preserved');
        assert.ok(content.includes('showRxModal'), 'Schedule H Rx modal must be preserved');
        assert.ok(content.includes('ThermalReceiptPreview'), 'Thermal receipt preview must be preserved');
        assert.ok(content.includes('shareInvoiceViaWhatsApp'), 'WhatsApp sharing must be preserved');
      });

      it('M2-POS-5: applies semantic tokens and mobile bottom padding', () => {
        const content = fs.readFileSync(posPath, 'utf8');
        assert.ok(content.includes('bg-surface-base'), 'Must use semantic surface-base token');
        assert.ok(content.includes('border-border'), 'Must use semantic border token');
        assert.ok(content.includes('pb-16 lg:pb-0'), 'Must contain pb-16 lg:pb-0 for mobile nav');
      });
    });
  });
}
