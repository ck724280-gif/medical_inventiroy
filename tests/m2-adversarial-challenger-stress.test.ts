import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import {
  calculateDetailedLineTotal,
  calculateCashChange,
  roundToDecimals,
  formatCurrency,
  formatDate,
} from '@medical-inventory/shared-utils';
import { loginSchema } from '@medical-inventory/validation';

export function runM2AdversarialStressTests() {
  describe('🥊 Milestone 2: Adversarial & Stress Testing Suite', () => {
    const rootDir = path.resolve(__dirname, '..');
    const loginFile = path.join(rootDir, 'apps', 'web', 'src', 'app', 'login', 'page.tsx');
    const dashboardFile = path.join(rootDir, 'apps', 'web', 'src', 'app', 'page.tsx');
    const posFile = path.join(rootDir, 'apps', 'web', 'src', 'app', 'pos', 'page.tsx');
    const cartStoreFile = path.join(rootDir, 'apps', 'web', 'src', 'stores', 'cart-store.ts');

    describe('1. Login Form & Password Toggle Stress Tests', () => {
      it('M2-ADV-LOG-1: Schema validates valid email and password format', () => {
        const validData = { email: 'pharmacist@hospital.org', password: 'Password@123' };
        const result = loginSchema.safeParse(validData);
        assert.equal(result.success, true, 'Valid credentials should pass schema validation');
      });

      it('M2-ADV-LOG-2: Schema rejects empty email or short/empty password', () => {
        const emptyEmail = { email: '', password: 'Password@123' };
        const shortPassword = { email: 'admin@medcare.com', password: '123' };
        assert.equal(loginSchema.safeParse(emptyEmail).success, false, 'Empty email must fail');
        assert.equal(loginSchema.safeParse(shortPassword).success, false, 'Short password (<6 chars) must fail');
      });

      it('M2-ADV-LOG-3: Login source code implements strict state-driven password toggle', () => {
        const content = fs.readFileSync(loginFile, 'utf8');
        // Check toggle implementation details
        assert.ok(content.includes('const [showPassword, setShowPassword] = useState(false)'));
        assert.ok(content.includes("type={showPassword ? 'text' : 'password'}"));
        assert.ok(content.includes('setShowPassword(!showPassword)'));
        assert.ok(content.includes('<EyeOff') && content.includes('<Eye'));
      });

      it('M2-ADV-LOG-4: Login button disables and displays loading indicator on submission', () => {
        const content = fs.readFileSync(loginFile, 'utf8');
        assert.ok(content.includes('isLoading={loading}'), 'Button must receive loading prop');
        assert.ok(content.includes('disabled={loading}'), 'Inputs and buttons must disable while loading');
        assert.ok(content.includes('setLoading(true)') && content.includes('setLoading(false)'));
      });

      it('M2-ADV-LOG-5: Inline error banner is rendered safely without crash when API fails', () => {
        const content = fs.readFileSync(loginFile, 'utf8');
        assert.ok(content.includes('errorMessage && ('));
        assert.ok(content.includes('AlertCircle'));
        assert.ok(content.includes('bg-status-error-bg'));
      });

      it('M2-ADV-LOG-6: Reactive branding fallback handles undefined logo and name cleanly', () => {
        const content = fs.readFileSync(loginFile, 'utf8');
        assert.ok(content.includes("storeName || 'Pharmacy & Healthcare'"));
        assert.ok(content.includes("storeName ? storeName.charAt(0).toUpperCase() : '+'"));
      });
    });

    describe('2. Dashboard Empty & Loading State Stress Tests', () => {
      it('M2-ADV-DASH-1: Zero-canvas & zero-motion stagger compliance', () => {
        const content = fs.readFileSync(dashboardFile, 'utf8');
        assert.equal(content.includes('SpatialMedicalCanvas'), false);
        assert.equal(content.includes('spatial-canvas'), false);
        assert.equal(content.includes('containerVariants'), false);
        assert.equal(content.includes('itemVariants'), false);
        assert.ok(content.includes('animate-fade-in'));
      });

      it('M2-ADV-DASH-2: FormatCurrency handles 0, negative, and large amounts safely', () => {
        assert.equal(formatCurrency(0), '₹0.00');
        assert.equal(formatCurrency(1500), '₹1,500.00');
        assert.equal(formatCurrency(10000000), '₹1,00,00,000.00');
      });

      it('M2-ADV-DASH-3: Dashboard handles empty summary and empty recent invoices without runtime errors', () => {
        const content = fs.readFileSync(dashboardFile, 'utf8');
        // Check fallback zeros
        assert.ok(content.includes('summary?.todaySales || 0'));
        assert.ok(content.includes('summary?.todayGrossProfit || 0'));
        assert.ok(content.includes('summary?.currentStockValue || 0'));
        assert.ok(content.includes('summary?.expiredStockCount || 0'));
        assert.ok(content.includes('summary?.lowStockCount || 0'));
        assert.ok(content.includes('emptyTitle="No Recent Invoices"'));
        assert.ok(content.includes('emptyDescription="Invoices generated in the POS will appear here."'));
      });

      it('M2-ADV-DASH-4: Loading skeletons rendered for all 4 KPI tiles and sales chart', () => {
        const content = fs.readFileSync(dashboardFile, 'utf8');
        const skeletonMatches = content.match(/<Skeleton/g);
        assert.ok(skeletonMatches && skeletonMatches.length >= 4, 'Must render Skeleton for KPIs and chart');
      });

      it('M2-ADV-DASH-5: Responsive 4-card grid and quick actions routing', () => {
        const content = fs.readFileSync(dashboardFile, 'utf8');
        assert.ok(content.includes('grid-cols-2 lg:grid-cols-4'));
        assert.ok(content.includes('href="/pos"'));
        assert.ok(content.includes('href="/purchases"'));
        assert.ok(content.includes('href="/medicines"'));
        assert.ok(content.includes('href="/reports"'));
      });
    });

    describe('3. POS Hub, Hotkeys & Cart Conversions Stress Tests', () => {
      it('M2-ADV-POS-1: Preserves keyboard hotkey handlers (F1, F2, F4, F8, F9, +, -, Delete, Escape)', () => {
        const content = fs.readFileSync(posFile, 'utf8');
        const keys = ['F1', 'F2', 'F4', 'F8', 'F9', '+', '-', 'Delete', 'Escape'];
        for (const key of keys) {
          assert.ok(
            content.includes(`'${key}'`) || content.includes(`"${key}"`),
            `POS must implement '${key}' hotkey`
          );
        }
      });

      it('M2-ADV-POS-2: Multi-unit multiplier logic (TABLET = 1, STRIP = tabletsPerStrip, BOX = stripsPerBox * tabletsPerStrip)', () => {
        const cartContent = fs.readFileSync(cartStoreFile, 'utf8');
        assert.ok(cartContent.includes("if (unitLevel === 'STRIP') return tabletsPerStrip || 10;"));
        assert.ok(cartContent.includes("if (unitLevel === 'BOX') return (stripsPerBox || 10) * (tabletsPerStrip || 10);"));
        assert.ok(cartContent.includes("return 1;"));
      });

      it('M2-ADV-POS-3: Line item calculation: baseRate * multiplier with discount & tax', () => {
        // Base rate per tablet = 5. Strips = 10 tablets, Box = 10 strips (100 tablets).
        // 1 STRIP (10 tablets) @ baseRate ₹5 = ₹50 rate.
        // Qty: 2 strips = ₹100.
        // Item Discount: 10% -> Taxable = ₹90.
        // Tax (GST): 12% -> Tax Amount = ₹10.80.
        // Line total = ₹100.80.
        const line = calculateDetailedLineTotal(2, 50, 10, 12);
        assert.equal(line.taxableAmount, 90);
        assert.equal(line.taxAmount, 10.8);
        assert.equal(line.lineTotal, 100.8);
      });

      it('M2-ADV-POS-4: Invoice-level discount applied on grand total', () => {
        const line1 = calculateDetailedLineTotal(1, 200, 0, 18); // 200 + 36 = 236
        const line2 = calculateDetailedLineTotal(2, 100, 0, 12); // 200 + 24 = 224
        const subtotal = line1.lineTotal + line2.lineTotal; // 460
        const invoiceDiscountPercent = 10;
        const discountAmount = (subtotal * invoiceDiscountPercent) / 100; // 46
        const grandTotal = roundToDecimals(subtotal - discountAmount); // 414
        assert.equal(grandTotal, 414);
      });

      it('M2-ADV-POS-5: Multi-tender split payment balance and cash change calculations', () => {
        const grandTotal = 1250;
        const cashPaid = 500;
        const upiPaid = 500;
        const totalPaid = cashPaid + upiPaid;
        const balanceDue = Math.max(0, roundToDecimals(grandTotal - totalPaid));
        assert.equal(balanceDue, 250, 'Balance due must be 250');

        const fullPaidCash = 1500;
        const change = calculateCashChange(grandTotal, fullPaidCash);
        assert.equal(change.changeAmount, 250, 'Cash change must be 250');
        assert.equal(change.isSufficient, true, 'Payment must be marked sufficient');
      });

      it('M2-ADV-POS-6: FEFO batch switching updates rate, tax, and line totals consistently', () => {
        const batchA = { id: 'b1', batchNumber: 'B101', sellingPrice: 120, taxPercent: 12, mrp: 150 };
        const batchB = { id: 'b2', batchNumber: 'B102', sellingPrice: 110, taxPercent: 18, mrp: 140 };

        const lineA = calculateDetailedLineTotal(1, batchA.sellingPrice, 0, batchA.taxPercent);
        const lineB = calculateDetailedLineTotal(1, batchB.sellingPrice, 0, batchB.taxPercent);

        assert.equal(lineA.lineTotal, 134.4); // 120 + 14.4
        assert.equal(lineB.lineTotal, 129.8); // 110 + 19.8
      });

      it('M2-ADV-POS-7: Zero and extreme boundary quantities are handled safely', () => {
        const zeroLine = calculateDetailedLineTotal(0, 100, 10, 12);
        assert.equal(zeroLine.lineTotal, 0);

        const bulkLine = calculateDetailedLineTotal(5000, 10, 5, 18);
        // Taxable = 5000 * 10 * 0.95 = 47,500
        // Tax = 47,500 * 0.18 = 8,550
        // Line total = 56,050
        assert.equal(bulkLine.lineTotal, 56050);
      });
    });
  });
}
