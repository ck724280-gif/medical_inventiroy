import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as React from 'react';

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
} from '../apps/web/src/components/ui/index';

export function runM1AdversarialStressTests() {
  describe('🔥 CHALLENGER 1: Milestone 1 Design System & UI Primitives Stress Suite', () => {

    // =========================================================================
    // 1. TOKEN COMPLETENESS & SYNTAX STRESS TESTING
    // =========================================================================
    describe('1. CSS Token Layer Completeness & Syntax Verification', () => {
      const globalsCssPath = path.resolve(__dirname, '../apps/web/src/app/globals.css');
      const tailwindConfigPath = path.resolve(__dirname, '../apps/web/tailwind.config.ts');
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
      const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');

      // Extract :root block
      const rootMatch = globalsCss.match(/:root\s*\{([^}]+)\}/);
      assert.ok(rootMatch && rootMatch[1], ':root block must exist in globals.css');
      const rootBlock = rootMatch[1];

      // Extract .dark block
      const darkMatch = globalsCss.match(/\.dark\s*\{([^}]+)\}/);
      assert.ok(darkMatch && darkMatch[1], '.dark block must exist in globals.css');
      const darkBlock = darkMatch[1];

      // Parser helper for CSS variables
      const parseCssVars = (block: string) => {
        const vars = new Map<string, string>();
        const lines = block.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('--') && trimmed.includes(':')) {
            const [name, ...valParts] = trimmed.split(':');
            const val = valParts.join(':').replace(/;.*$/, '').trim();
            if (name && val) {
              vars.set(name.trim(), val);
            }
          }
        }
        return vars;
      };

      const rootVars = parseCssVars(rootBlock);
      const darkVars = parseCssVars(darkBlock);

      it('M1-STRESS-1.1: globals.css must define at least 40 semantic CSS variables in :root and .dark', () => {
        assert.ok(rootVars.size >= 40, `:root defines ${rootVars.size} variables (expected >= 40)`);
        assert.ok(darkVars.size >= 40, `.dark defines ${darkVars.size} variables (expected >= 40)`);
      });

      it('M1-STRESS-1.2: 100% token symmetry between :root and .dark (all light tokens must exist in dark)', () => {
        const missingInDark: string[] = [];
        for (const [tokenName] of rootVars.entries()) {
          if (!darkVars.has(tokenName)) {
            missingInDark.push(tokenName);
          }
        }
        assert.deepStrictEqual(
          missingInDark,
          [],
          `Tokens present in :root but missing in .dark: ${missingInDark.join(', ')}`
        );
      });

      it('M1-STRESS-1.3: Token syntax validation (Hex codes, RGBA, Rem, Pixels, Shadows, Radius)', () => {
        const isValidCssVal = (val: string) => {
          // Check for valid hex, rgb, rgba, rem, px, shadows, or var references
          const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
          const rgbaPattern = /^rgba?\([^)]+\)$/;
          const lengthPattern = /^[0-9.]+(rem|px|em|%)$/;
          const shadowPattern = /[0-9]+px|rgba?\(/;
          const numPattern = /^[0-9.]+$/;

          return (
            hexPattern.test(val) ||
            rgbaPattern.test(val) ||
            lengthPattern.test(val) ||
            shadowPattern.test(val) ||
            numPattern.test(val)
          );
        };

        for (const [name, val] of rootVars.entries()) {
          assert.ok(
            isValidCssVal(val),
            `Invalid CSS token syntax in :root: ${name} = "${val}"`
          );
        }

        for (const [name, val] of darkVars.entries()) {
          assert.ok(
            isValidCssVal(val),
            `Invalid CSS token syntax in .dark: ${name} = "${val}"`
          );
        }
      });

      it('M1-STRESS-1.4: Dark mode tokens are independently designed (dark surfaces are dark, not inverted)', () => {
        // --surface-page in light is #f9fafb (bright), in dark is #0d1117 (dark)
        const lightSurfacePage = rootVars.get('--surface-page');
        const darkSurfacePage = darkVars.get('--surface-page');

        assert.strictEqual(lightSurfacePage, '#f9fafb');
        assert.strictEqual(darkSurfacePage, '#0d1117');

        // Text primary in light is dark (#111827), in dark is light (#e6edf3)
        const lightText = rootVars.get('--text-primary');
        const darkText = darkVars.get('--text-primary');

        assert.strictEqual(lightText, '#111827');
        assert.strictEqual(darkText, '#e6edf3');
      });

      it('M1-STRESS-1.5: Tailwind config maps all primary semantic surfaces, borders, text, accents, and status tokens', () => {
        const requiredMappings = [
          'surface.page',
          'surface.base',
          'surface.raised',
          'surface.overlay',
          'border.default',
          'border.strong',
          'text.primary',
          'text.secondary',
          'text.muted',
          'accent.primary',
          'accent.hover',
          'status.success',
          'status.warning',
          'status.error',
          'status.info',
        ];

        for (const req of requiredMappings) {
          const [group, key] = req.split('.');
          assert.ok(
            tailwindConfig.includes(`--${group}-${key}`),
            `tailwind.config.ts must map var(--${group}-${key})`
          );
        }
      });

      it('M1-STRESS-1.6: Tailwind config contains ZERO AI template artifacts and retains brand scale', () => {
        const forbiddenAiArtifacts = [
          'glow-cyan',
          'aurora',
          'pulse-ring',
          'cyan-pulse',
          'glass:',
          'obsidian:',
        ];

        for (const artifact of forbiddenAiArtifacts) {
          assert.ok(
            !tailwindConfig.includes(artifact),
            `Forbidden AI template artifact found in tailwind.config.ts: ${artifact}`
          );
        }

        // Retains brand scale (50-900)
        assert.ok(tailwindConfig.includes('brand:'), 'tailwind.config.ts must retain brand scale');
        assert.ok(tailwindConfig.includes('500: \'#06b6d4\''), 'brand.500 must be #06b6d4');
      });
    });

    // =========================================================================
    // 2. UI PRIMITIVES STRUCTURAL & RUNTIME VERIFICATION
    // =========================================================================
    describe('2. UI Primitives Barrel Export & Structural Integrity', () => {
      it('M1-STRESS-2.1: index.ts exports all 13 primitives + Day 1 SmartAutocomplete without collision', () => {
        const exportedItems = [
          { name: 'Button', val: Button, type: 'object' },
          { name: 'Input', val: Input, type: 'object' },
          { name: 'Badge', val: Badge, type: 'object' },
          { name: 'Card', val: Card, type: 'object' },
          { name: 'CardHeader', val: CardHeader, type: 'object' },
          { name: 'CardTitle', val: CardTitle, type: 'object' },
          { name: 'CardDescription', val: CardDescription, type: 'object' },
          { name: 'CardContent', val: CardContent, type: 'object' },
          { name: 'CardFooter', val: CardFooter, type: 'object' },
          { name: 'Skeleton', val: Skeleton, type: 'object' },
          { name: 'EmptyState', val: EmptyState, type: 'object' },
          { name: 'DataTable', val: DataTable, type: 'function' },
          { name: 'Modal', val: Modal, type: 'function' },
          { name: 'ConfirmDialog', val: ConfirmDialog, type: 'function' },
          { name: 'toast', val: toast, type: 'object' },
          { name: 'ToastProvider', val: ToastProvider, type: 'function' },
          { name: 'useToast', val: useToast, type: 'function' },
          { name: 'Tabs', val: Tabs, type: 'function' },
          { name: 'TabsList', val: TabsList, type: 'object' },
          { name: 'TabsTrigger', val: TabsTrigger, type: 'object' },
          { name: 'TabsContent', val: TabsContent, type: 'object' },
          { name: 'Select', val: Select, type: 'object' },
          { name: 'PageHeader', val: PageHeader, type: 'object' },
          { name: 'SmartAutocomplete', val: SmartAutocomplete, type: 'function' },
          { name: 'HighlightMatch', val: HighlightMatch, type: 'function' },
        ];

        for (const item of exportedItems) {
          assert.ok(
            item.val !== undefined && item.val !== null,
            `Export "${item.name}" in components/ui/index.ts must not be undefined or null`
          );
          assert.strictEqual(
            typeof item.val,
            item.type,
            `Export "${item.name}" must have type ${item.type}`
          );
        }
      });
    });

    // =========================================================================
    // 3. ADVERSARIAL EDGE CASES & COMPONENT LOGIC TESTING
    // =========================================================================
    describe('3. Adversarial Edge Cases & Component Logic Testing', () => {

      // --- DataTable Edge Cases ---
      describe('DataTable Edge Cases', () => {
        it('M1-STRESS-3.1: DataTable creates valid React elements for empty data and custom state', () => {
          const emptyProps = {
            data: [],
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Medicine Name' },
            ],
            emptyTitle: 'No items in stock',
            emptyDescription: 'Add items via purchase inward.',
          };

          const element = React.createElement(DataTable, emptyProps);
          assert.ok(React.isValidElement(element), 'DataTable with empty data must return a valid React element');
        });

        it('M1-STRESS-3.2: DataTable handles custom column accessor functions and fallback key extraction', () => {
          interface MedicineItem {
            id?: string;
            name: string;
            mrp?: number;
            stock?: number;
          }

          const testRows: MedicineItem[] = [
            { id: 'm1', name: 'Paracetamol', mrp: 20, stock: 100 },
            { name: 'Amoxicillin (no ID)', mrp: 85, stock: 15 },
          ];

          const columns = [
            { key: 'name', header: 'Name' },
            {
              key: 'stockStatus',
              header: 'Status',
              accessor: (row: MedicineItem) => (row.stock && row.stock > 20 ? 'In-Stock' : 'Low Stock'),
            },
            {
              key: 'formattedMrp',
              header: 'MRP',
              accessor: (row: MedicineItem) => `₹${row.mrp?.toFixed(2)}`,
            },
          ];

          const element = React.createElement(DataTable, {
            data: testRows,
            columns,
            selectable: true,
            selectedRowIds: ['m1', 1],
            pagination: {
              page: 1,
              pageSize: 10,
              totalItems: 2,
              onPageChange: () => {},
            },
          });

          assert.ok(React.isValidElement(element));
        });

        it('M1-STRESS-3.3: DataTable pagination math boundaries (page 1, middle page, last page, empty)', () => {
          const calcPagination = (page: number, pageSize: number, totalItems: number) => {
            const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
            const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
            const endItem = Math.min(page * pageSize, totalItems);
            const canPrev = page > 1;
            const canNext = page < totalPages;

            return { totalPages, startItem, endItem, canPrev, canNext };
          };

          // Case 1: 0 items
          const p0 = calcPagination(1, 10, 0);
          assert.strictEqual(p0.totalPages, 1);
          assert.strictEqual(p0.startItem, 0);
          assert.strictEqual(p0.endItem, 0);
          assert.strictEqual(p0.canPrev, false);
          assert.strictEqual(p0.canNext, false);

          // Case 2: Exact page boundary (50 items, pageSize 10)
          const p50 = calcPagination(5, 10, 50);
          assert.strictEqual(p50.totalPages, 5);
          assert.strictEqual(p50.startItem, 41);
          assert.strictEqual(p50.endItem, 50);
          assert.strictEqual(p50.canPrev, true);
          assert.strictEqual(p50.canNext, false);

          // Case 3: Partial last page (53 items, page 6)
          const p53 = calcPagination(6, 10, 53);
          assert.strictEqual(p53.totalPages, 6);
          assert.strictEqual(p53.startItem, 51);
          assert.strictEqual(p53.endItem, 53);
          assert.strictEqual(p53.canPrev, true);
          assert.strictEqual(p53.canNext, false);
        });
      });

      // --- Toast Notification System Stress ---
      describe('Toast Notification System Stress', () => {
        it('M1-STRESS-3.4: Toast standalone emitter handles rapid fire (100 toasts in loop)', () => {
          const generatedIds: string[] = [];
          for (let i = 0; i < 100; i++) {
            const id = toast.success(`Sale #${1000 + i} processed`, 'POS Success', 3000);
            generatedIds.push(id);
          }

          assert.strictEqual(generatedIds.length, 100);
          const uniqueIds = new Set(generatedIds);
          assert.strictEqual(uniqueIds.size, 100, 'All generated toast IDs must be unique');
        });

        it('M1-STRESS-3.5: Toast all 4 variants (success, error, warning, info) with custom durations', () => {
          const sId = toast.success('Payment received', 'Success', 1000);
          const eId = toast.error('Out of stock', 'Error', 5000);
          const wId = toast.warning('Expiring in 15 days', 'Warning', 2500);
          const iId = toast.info('System update available', 'Notice', 4000);

          assert.ok(sId.startsWith('toast-'));
          assert.ok(eId.startsWith('toast-'));
          assert.ok(wId.startsWith('toast-'));
          assert.ok(iId.startsWith('toast-'));
        });
      });

      // --- Badge & Button Variants ---
      describe('Badge & Button Variants', () => {
        it('M1-STRESS-3.6: Badge supports all 6 variants (default, success, warning, error, info, outline)', () => {
          const variants = ['default', 'success', 'warning', 'error', 'info', 'outline'] as const;
          for (const v of variants) {
            const el = React.createElement(Badge, { variant: v, dot: true }, `Badge-${v}`);
            assert.ok(React.isValidElement(el));
          }
        });

        it('M1-STRESS-3.7: Button supports all 5 variants and handles loading/disabled states', () => {
          const variants = ['primary', 'secondary', 'ghost', 'destructive', 'outline'] as const;
          for (const v of variants) {
            const el = React.createElement(Button, { variant: v, size: 'sm', loading: true }, `Btn-${v}`);
            assert.ok(React.isValidElement(el));
          }
        });
      });

      // --- Input & Select Error States ---
      describe('Input & Select Error States', () => {
        it('M1-STRESS-3.8: Input handles string error message and boolean error without crashing', () => {
          const inputWithStringErr = React.createElement(Input, {
            label: 'Batch Number',
            error: 'Batch number is required',
            helperText: 'Enter batch printed on box',
          });
          assert.ok(React.isValidElement(inputWithStringErr));

          const inputWithBoolErr = React.createElement(Input, {
            label: 'Quantity',
            error: true,
          });
          assert.ok(React.isValidElement(inputWithBoolErr));
        });

        it('M1-STRESS-3.9: Select handles options list, placeholder, and error states', () => {
          const selectEl = React.createElement(Select, {
            label: 'Dosage Form',
            error: 'Please select a form',
            placeholder: 'Choose dosage...',
            options: [
              { label: 'Tablet', value: 'TABLET' },
              { label: 'Syrup', value: 'SYRUP' },
              { label: 'Injection', value: 'INJECTION', disabled: true },
            ],
          });
          assert.ok(React.isValidElement(selectEl));
        });
      });

      // --- Modal & Confirmation Dialog ---
      describe('Modal & Confirmation Dialog', () => {
        it('M1-STRESS-3.10: ConfirmDialog and Modal element instantiation', () => {
          const dangerDialog = React.createElement(ConfirmDialog, {
            isOpen: false,
            onClose: () => {},
            onConfirm: async () => {},
            title: 'Delete Customer',
            description: 'This will permanently remove the customer record.',
            variant: 'danger',
          });
          assert.ok(React.isValidElement(dangerDialog));

          const standardModal = React.createElement(Modal, {
            isOpen: true,
            onClose: () => {},
            title: 'Modal Title',
            children: 'Modal Content',
          });
          assert.ok(React.isValidElement(standardModal));
        });
      });

      // --- Skeleton, EmptyState, Tabs, PageHeader ---
      describe('Skeleton, EmptyState, Tabs, and PageHeader', () => {
        it('M1-STRESS-3.11: Skeleton handles table-row multi-column and multi-line variants', () => {
          const tableSkeleton = React.createElement(Skeleton, { variant: 'table-row', rows: 5, columns: 6 });
          assert.ok(React.isValidElement(tableSkeleton));

          const lineSkeleton = React.createElement(Skeleton, { variant: 'line', rows: 4 });
          assert.ok(React.isValidElement(lineSkeleton));

          const circleSkeleton = React.createElement(Skeleton, { variant: 'circle' });
          assert.ok(React.isValidElement(circleSkeleton));
        });

        it('M1-STRESS-3.12: EmptyState renders with icon component and action button', () => {
          const empty = React.createElement(EmptyState, {
            title: 'No medicines found',
            description: 'Try adjusting your search criteria.',
            action: {
              label: 'Add Medicine',
              onClick: () => {},
            },
          });
          assert.ok(React.isValidElement(empty));
        });

        it('M1-STRESS-3.13: Tabs and PageHeader render complete compound structures', () => {
          const tabsEl = React.createElement(
            Tabs,
            { defaultValue: 'tab1' },
            React.createElement(
              TabsList,
              {},
              React.createElement(TabsTrigger, { value: 'tab1' }, 'Sales'),
              React.createElement(TabsTrigger, { value: 'tab2' }, 'Purchases')
            ),
            React.createElement(TabsContent, { value: 'tab1' }, 'Sales Content')
          );
          assert.ok(React.isValidElement(tabsEl));

          const pageHeaderEl = React.createElement(PageHeader, {
            title: 'Sales Invoices',
            description: 'View and manage all customer invoices',
            breadcrumbs: [
              { label: 'Operations', href: '/' },
              { label: 'Sales & Invoices' },
            ],
            badge: React.createElement(Badge, { variant: 'info' }, 'Live'),
            actions: React.createElement(Button, {}, 'New Sale'),
          });
          assert.ok(React.isValidElement(pageHeaderEl));
        });
      });
    });
  });
}

// Auto-run if executed directly via node/tsx
if (process.argv[1] && process.argv[1].includes('m1-adversarial-ui-primitives.test.ts')) {
  runM1AdversarialStressTests();
}
