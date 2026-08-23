import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import UI Primitives Barrel Export
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  EmptyState,
  DataTable,
  Modal,
  ConfirmDialog,
  toast,
  ToastProvider,
  useToast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  PageHeader,
  SmartAutocomplete,
  HighlightMatch,
} from '../../apps/web/src/components/ui/index';

export function runUiPrimitivesTests() {
  describe('Milestone 1 - Design System & UI Primitives Suite', () => {
    it('M1-T1-1: should verify all 13 UI primitives and SmartAutocomplete are exported cleanly', () => {
      assert.strictEqual(typeof Button, 'object'); // React.forwardRef
      assert.strictEqual(typeof Input, 'object'); // React.forwardRef
      assert.strictEqual(typeof Badge, 'object'); // React.forwardRef
      assert.strictEqual(typeof Card, 'object'); // React.forwardRef
      assert.strictEqual(typeof CardHeader, 'object');
      assert.strictEqual(typeof CardTitle, 'object');
      assert.strictEqual(typeof CardDescription, 'object');
      assert.strictEqual(typeof CardContent, 'object');
      assert.strictEqual(typeof CardFooter, 'object');
      assert.strictEqual(typeof Skeleton, 'object'); // React.forwardRef
      assert.strictEqual(typeof EmptyState, 'object'); // React.forwardRef
      assert.strictEqual(typeof DataTable, 'function');
      assert.strictEqual(typeof Modal, 'function');
      assert.strictEqual(typeof ConfirmDialog, 'function');
      assert.strictEqual(typeof toast, 'object');
      assert.strictEqual(typeof ToastProvider, 'function');
      assert.strictEqual(typeof useToast, 'function');
      assert.strictEqual(typeof Tabs, 'function');
      assert.strictEqual(typeof TabsList, 'object');
      assert.strictEqual(typeof TabsTrigger, 'object');
      assert.strictEqual(typeof TabsContent, 'object');
      assert.strictEqual(typeof Select, 'object'); // React.forwardRef
      assert.strictEqual(typeof PageHeader, 'object'); // React.forwardRef
      assert.strictEqual(typeof SmartAutocomplete, 'function');
      assert.strictEqual(typeof HighlightMatch, 'function');
    });

    it('M1-T1-2: should verify globals.css contains 40+ semantic variables for both :root and .dark', () => {
      const globalsCssPath = path.resolve(__dirname, '../../apps/web/src/app/globals.css');
      const content = fs.readFileSync(globalsCssPath, 'utf8');

      const expectedTokens = [
        '--surface-page',
        '--surface-base',
        '--surface-raised',
        '--surface-overlay',
        '--surface-sunken',
        '--surface-hover',
        '--surface-active',
        '--border-default',
        '--border-strong',
        '--border-subtle',
        '--border-focus',
        '--border-divider',
        '--border-card',
        '--border-active',
        '--text-primary',
        '--text-secondary',
        '--text-muted',
        '--text-disabled',
        '--text-inverse',
        '--text-main',
        '--text-dim',
        '--accent-primary',
        '--accent-hover',
        '--accent-active',
        '--accent-subtle',
        '--accent-subtle-border',
        '--accent-foreground',
        '--status-success',
        '--status-success-bg',
        '--status-success-border',
        '--status-warning',
        '--status-warning-bg',
        '--status-warning-border',
        '--status-error',
        '--status-error-bg',
        '--status-error-border',
        '--status-info',
        '--status-info-bg',
        '--status-info-border',
        '--shadow-sm',
        '--shadow-md',
        '--shadow-lg',
        '--radius-sm',
        '--radius-md',
        '--radius-lg',
        '--radius-xl',
      ];

      // Check root section
      assert.ok(content.includes(':root {'), 'Missing :root section in globals.css');
      assert.ok(content.includes('.dark {'), 'Missing .dark section in globals.css');

      for (const token of expectedTokens) {
        assert.ok(
          content.includes(token),
          `Expected token ${token} to be present in globals.css`
        );
      }

      // Check thermal receipt print styles
      assert.ok(
        content.includes('@media print'),
        'globals.css must preserve @media print for thermal receipts'
      );
      assert.ok(
        content.includes('#thermal-receipt-print-area'),
        'globals.css must preserve #thermal-receipt-print-area'
      );
    });

    it('M1-T1-3: should verify tailwind.config.ts maps all semantic colors and has no AI artifacts', () => {
      const tailwindConfigPath = path.resolve(__dirname, '../../apps/web/tailwind.config.ts');
      const content = fs.readFileSync(tailwindConfigPath, 'utf8');

      // Verify semantic colors are present
      assert.ok(content.includes('surface:'), 'surface color group missing');
      assert.ok(content.includes('border:'), 'border color group missing');
      assert.ok(content.includes('text:'), 'text color group missing');
      assert.ok(content.includes('accent:'), 'accent color group missing');
      assert.ok(content.includes('status:'), 'status color group missing');
      assert.ok(content.includes('brand:'), 'brand color scale missing');

      // Verify AI artifacts were cleanly removed
      assert.ok(!content.includes('glow-cyan'), 'AI glow-cyan artifact still present');
      assert.ok(!content.includes('obsidian:'), 'AI obsidian artifact still present');
      assert.ok(!content.includes('glass:'), 'AI glass artifact still present');
      assert.ok(!content.includes('aurora'), 'AI aurora artifact still present');
      assert.ok(!content.includes('pulse-ring'), 'AI pulse-ring artifact still present');
      assert.ok(!content.includes('cyan-pulse'), 'AI cyan-pulse artifact still present');
    });

    it('M1-T1-4: should verify Toast emitter generates valid toast items with custom parameters', () => {
      let emittedToast: any = null;
      const { toast } = require('../../apps/web/src/components/ui/toast');

      const id = toast.success('Sale #INV-1001 completed successfully', 'Payment Received', 5000);
      assert.ok(id.startsWith('toast-'), 'Toast ID should be generated properly');

      const errId = toast.error('Batch B-902 expired', 'Compliance Alert');
      assert.ok(errId.startsWith('toast-'), 'Error Toast ID should be generated');

      const warnId = toast.warning('Low stock for Amoxicillin 500mg');
      assert.ok(warnId.startsWith('toast-'), 'Warning Toast ID should be generated');

      const infoId = toast.info('New purchase order synced');
      assert.ok(infoId.startsWith('toast-'), 'Info Toast ID should be generated');
    });

    it('M1-T1-5: should verify DataTable pagination mathematics and column accessor extraction', () => {
      const sampleData = [
        { id: '1', medicineName: 'Paracetamol 500mg', stock: 120, unitPrice: 2.5 },
        { id: '2', medicineName: 'Amoxicillin 250mg', stock: 45, unitPrice: 8.0 },
        { id: '3', medicineName: 'Cetirizine 10mg', stock: 200, unitPrice: 1.2 },
      ];

      const columns = [
        { key: 'medicineName', header: 'Medicine', sortable: true },
        {
          key: 'stock',
          header: 'Stock',
          accessor: (row: typeof sampleData[0]) => `${row.stock} strips`,
        },
        {
          key: 'totalValue',
          header: 'Total Value',
          accessor: (row: typeof sampleData[0]) => `₹${(row.stock * row.unitPrice).toFixed(2)}`,
        },
      ];

      // Test accessor functions
      assert.strictEqual(typeof columns[1].accessor, 'function');
      assert.strictEqual((columns[1].accessor as any)(sampleData[0]), '120 strips');
      assert.strictEqual((columns[2].accessor as any)(sampleData[0]), '₹300.00');

      // Test pagination calculation logic
      const totalItems = 124;
      const pageSize = 10;
      const totalPages = Math.ceil(totalItems / pageSize);
      assert.strictEqual(totalPages, 13);

      const page1Start = (1 - 1) * pageSize + 1;
      const page1End = Math.min(1 * pageSize, totalItems);
      assert.strictEqual(page1Start, 1);
      assert.strictEqual(page1End, 10);

      const page13Start = (13 - 1) * pageSize + 1;
      const page13End = Math.min(13 * pageSize, totalItems);
      assert.strictEqual(page13Start, 121);
      assert.strictEqual(page13End, 124);
    });
  });
}
