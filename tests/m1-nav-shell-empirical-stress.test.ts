import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import Store for runtime test
import { useUiStore } from '../apps/web/src/stores/ui-store';
import { useAuthStore } from '../apps/web/src/stores/auth-store';
import { useThemeStore } from '../apps/web/src/stores/theme-store';

export function runM1NavShellEmpiricalStressTests() {
  describe('🔬 CHALLENGER 1: M1 Navigation & Shell Redesign Adversarial Stress Suite', () => {

  // =========================================================================
  // 1. UI STORE LOGIC & STATE MUTATION STRESS TEST
  // =========================================================================
  describe('1. UI Store (ui-store.ts) State Transitions & Invariants', () => {
    it('M1-NAV-1.1: Initial State Invariants', () => {
      const state = useUiStore.getState();
      assert.strictEqual(typeof state.isSidebarCollapsed, 'boolean', 'isSidebarCollapsed must be boolean');
      assert.strictEqual(typeof state.isMobileSidebarOpen, 'boolean', 'isMobileSidebarOpen must be boolean');
      assert.strictEqual(typeof state.toggleSidebarCollapsed, 'function', 'toggleSidebarCollapsed must be function');
      assert.strictEqual(typeof state.setSidebarCollapsed, 'function', 'setSidebarCollapsed must be function');
      assert.strictEqual(typeof state.toggleMobileSidebar, 'function', 'toggleMobileSidebar must be function');
      assert.strictEqual(typeof state.openMobileSidebar, 'function', 'openMobileSidebar must be function');
      assert.strictEqual(typeof state.closeMobileSidebar, 'function', 'closeMobileSidebar must be function');
    });

    it('M1-NAV-1.2: toggleSidebarCollapsed cycles true/false reliably', () => {
      useUiStore.setState({ isSidebarCollapsed: false });
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, false);

      useUiStore.getState().toggleSidebarCollapsed();
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, true, 'Should toggle to true');

      useUiStore.getState().toggleSidebarCollapsed();
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, false, 'Should toggle back to false');
    });

    it('M1-NAV-1.3: setSidebarCollapsed sets explicit boolean state', () => {
      useUiStore.getState().setSidebarCollapsed(true);
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, true);

      useUiStore.getState().setSidebarCollapsed(true);
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, true, 'Idempotent set true');

      useUiStore.getState().setSidebarCollapsed(false);
      assert.strictEqual(useUiStore.getState().isSidebarCollapsed, false, 'Idempotent set false');
    });

    it('M1-NAV-1.4: Mobile sidebar state transitions', () => {
      useUiStore.setState({ isMobileSidebarOpen: false });

      useUiStore.getState().openMobileSidebar();
      assert.strictEqual(useUiStore.getState().isMobileSidebarOpen, true);

      useUiStore.getState().closeMobileSidebar();
      assert.strictEqual(useUiStore.getState().isMobileSidebarOpen, false);

      useUiStore.getState().toggleMobileSidebar();
      assert.strictEqual(useUiStore.getState().isMobileSidebarOpen, true);

      useUiStore.getState().closeMobileSidebar();
      assert.strictEqual(useUiStore.getState().isMobileSidebarOpen, false);
    });
  });

  // =========================================================================
  // 2. SIDEBAR STRUCTURE & NAVIGATION CONTRACT VERIFICATION
  // =========================================================================
  describe('2. Sidebar (sidebar.tsx) Contract & Visual Token Audit', () => {
    const sidebarPath = path.resolve(__dirname, '../apps/web/src/components/sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    it('M1-NAV-2.1: Contains all 5 required section groupings', () => {
      const requiredSections = ['OPERATIONS', 'INVENTORY', 'PEOPLE', 'FINANCE', 'MANAGEMENT'];
      for (const section of requiredSections) {
        assert.ok(
          sidebarContent.includes(`title: '${section}'`) || sidebarContent.includes(`title: "${section}"`),
          `Sidebar must contain navigation section: ${section}`
        );
      }
    });

    it('M1-NAV-2.2: Contains all 14 required route definitions', () => {
      const requiredRoutes = [
        { label: 'Dashboard', href: '/' },
        { label: 'POS Billing', href: '/pos' },
        { label: 'Sales & Invoices', href: '/sales' },
        { label: 'Sales Returns', href: '/sales-returns' },
        { label: 'Medicines', href: '/medicines' },
        { label: 'Inventory & Batches', href: '/inventory' },
        { label: 'Purchases', href: '/purchases' },
        { label: 'Purchase Orders', href: '/purchase-orders' },
        { label: 'Opening Stock / Import', href: '/import' },
        { label: 'Customers', href: '/customers' },
        { label: 'Suppliers', href: '/suppliers' },
        { label: 'Expenses', href: '/expenses' },
        { label: 'Reports & Analytics', href: '/reports' },
        { label: 'Settings', href: '/settings' },
      ];

      for (const route of requiredRoutes) {
        assert.ok(
          sidebarContent.includes(`href: '${route.href}'`) || sidebarContent.includes(`href: "${route.href}"`),
          `Sidebar must define route ${route.href}`
        );
        assert.ok(
          sidebarContent.includes(route.label),
          `Sidebar must contain label ${route.label}`
        );
      }
    });

    it('M1-NAV-2.3: Active state uses full-width pill token, NOT border-l-2', () => {
      assert.ok(!sidebarContent.includes('border-l-2'), 'Sidebar must not use old border-l-2 active state');
      assert.ok(sidebarContent.includes('bg-accent-subtle'), 'Sidebar active item must use bg-accent-subtle');
      assert.ok(sidebarContent.includes('text-accent-primary'), 'Sidebar active item must use text-accent-primary');
    });

    it('M1-NAV-2.4: Collapsible mode dimensions & icons (56px w-14 vs 240px w-60)', () => {
      assert.ok(sidebarContent.includes('w-14'), 'Sidebar must support collapsed width w-14 (56px)');
      assert.ok(sidebarContent.includes('w-60'), 'Sidebar must support expanded width w-60 (240px)');
      assert.ok(sidebarContent.includes('ChevronLeft'), 'Sidebar must import ChevronLeft for collapse action');
      assert.ok(sidebarContent.includes('ChevronRight'), 'Sidebar must import ChevronRight for expand action');
      assert.ok(sidebarContent.includes('title={item.label}'), 'Sidebar must supply title tooltip on hover');
    });

    it('M1-NAV-2.5: User profile footer initials avatar & role chip', () => {
      assert.ok(sidebarContent.includes('initials'), 'Sidebar must calculate initials');
      assert.ok(sidebarContent.includes('roleName') || sidebarContent.includes('user?.roles'), 'Sidebar must display role tag');
      assert.ok(sidebarContent.includes('bg-accent-subtle text-accent-primary'), 'Role tag must use accent tokens');
    });

    it('M1-NAV-2.6: Preserves useBrandingStore, useAuthStore, and useUiStore', () => {
      assert.ok(sidebarContent.includes('useBrandingStore'), 'Sidebar must integrate useBrandingStore (P2)');
      assert.ok(sidebarContent.includes('useAuthStore'), 'Sidebar must integrate useAuthStore');
      assert.ok(sidebarContent.includes('useUiStore'), 'Sidebar must integrate useUiStore');
    });
  });

  // =========================================================================
  // 3. HEADER UNIFORMITY & COMPONENT LOGIC STRESS TEST
  // =========================================================================
  describe('3. Header (header.tsx) Controls, Notification Badge, & P1 Integration', () => {
    const headerPath = path.resolve(__dirname, '../apps/web/src/components/header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');

    it('M1-NAV-3.1: Uniform 36px touch targets on icon buttons', () => {
      assert.ok(headerContent.includes('w-9 h-9'), 'Header icon buttons must use 36px (w-9 h-9) dimension');
      assert.ok(headerContent.includes('rounded-lg'), 'Header icon buttons must use rounded-lg styling');
      assert.ok(headerContent.includes('hover:bg-surface-hover'), 'Header buttons must use hover:bg-surface-hover token');
    });

    it('M1-NAV-3.2: Theme toggle is icon-only and has title tooltip', () => {
      assert.ok(headerContent.includes('Sun'), 'Header must render Sun icon in dark mode');
      assert.ok(headerContent.includes('Moon'), 'Header must render Moon icon in light mode');
      assert.ok(
        headerContent.includes("theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'") ||
        headerContent.includes('Switch to Light Mode'),
        'Header theme toggle must have tooltip title'
      );
      // Ensure no raw text node "Dark Mode" / "Light Mode" rendered in button body
      assert.ok(!headerContent.includes('>Dark Mode<'), 'Theme toggle must not contain raw text label');
      assert.ok(!headerContent.includes('>Light Mode<'), 'Theme toggle must not contain raw text label');
    });

    it('M1-NAV-3.3: Numeric notification badge logic verification', () => {
      assert.ok(headerContent.includes('unreadCount > 0'), 'Notifications badge must only render when unreadCount > 0');
      assert.ok(headerContent.includes("unreadCount > 99 ? '99+' : unreadCount"), 'Notifications must format >99 to 99+');
      assert.ok(headerContent.includes('variant="error"'), 'Notifications badge must use semantic error variant');
    });

    it('M1-NAV-3.4: Branch selector card pill & conditional rendering', () => {
      assert.ok(headerContent.includes('bg-surface-raised border border-border-default'), 'Branch selector must use semantic card styling');
      assert.ok(headerContent.includes('branches.length > 1'), 'Branch selector must differentiate multi-branch vs single branch');
    });

    it('M1-NAV-3.5: P1 SmartAutocomplete & GlobalCommandPalette preservation', () => {
      assert.ok(headerContent.includes('<GlobalCommandPalette />') || headerContent.includes('<GlobalCommandPalette'), 'GlobalCommandPalette must be preserved');
      assert.ok(headerContent.includes('<SmartAutocomplete'), 'SmartAutocomplete must be preserved');
      assert.ok(headerContent.includes("hotkey=\"k\"") || headerContent.includes("hotkey='k'"), 'SmartAutocomplete hotkey must be k');
      assert.ok(headerContent.includes('/search/universal'), 'SmartAutocomplete must connect to /search/universal');
    });
  });

  // =========================================================================
  // 4. MOBILE NAVIGATION BAR & ROUTE ISOLATION
  // =========================================================================
  describe('4. Mobile Navigation (mobile-nav.tsx) Bar & Drawer Integrity', () => {
    const mobileNavPath = path.resolve(__dirname, '../apps/web/src/components/mobile-nav.tsx');
    assert.ok(fs.existsSync(mobileNavPath), 'mobile-nav.tsx must exist');
    const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf8');

    it('M1-NAV-4.1: Hidden on large screens (lg:hidden) and fixed bottom', () => {
      assert.ok(mobileNavContent.includes('lg:hidden'), 'MobileNav must have lg:hidden class');
      assert.ok(mobileNavContent.includes('fixed bottom-0'), 'MobileNav must be fixed to bottom');
      assert.ok(mobileNavContent.includes('bg-surface-base'), 'MobileNav must use bg-surface-base token');
      assert.ok(mobileNavContent.includes('border-t border-border-default'), 'MobileNav must use border-t border-border-default');
    });

    it('M1-NAV-4.2: Suppressed completely on /login route', () => {
      assert.ok(
        mobileNavContent.includes("pathname === '/login'") && mobileNavContent.includes('return null;'),
        'MobileNav must return null on /login route'
      );
    });

    it('M1-NAV-4.3: 5 primary tabs including More trigger', () => {
      const primaryRoutes = ['/', '/pos', '/sales', '/inventory'];
      for (const route of primaryRoutes) {
        assert.ok(
          mobileNavContent.includes(`href: '${route}'`) || mobileNavContent.includes(`href: "${route}"`),
          `MobileNav PRIMARY_TABS must include ${route}`
        );
      }
      assert.ok(mobileNavContent.includes('MoreHorizontal') || mobileNavContent.includes('More'), 'MobileNav must include More tab');
    });

    it('M1-NAV-4.4: iOS safe area inset styling present on bar and drawer', () => {
      assert.ok(
        mobileNavContent.includes('safe-area-inset-bottom'),
        'MobileNav must implement safe-area-inset-bottom support'
      );
    });

    it('M1-NAV-4.5: Slide-up More drawer with permission filtering', () => {
      assert.ok(mobileNavContent.includes('isMoreOpen'), 'MobileNav must track isMoreOpen state');
      assert.ok(mobileNavContent.includes('hasPermission'), 'MobileNav must filter More items via hasPermission');
      assert.ok(mobileNavContent.includes('More Modules'), 'MobileNav drawer header must be present');
    });
  });

  // =========================================================================
  // 5. ROOT LAYOUT INTEGRATION
  // =========================================================================
  describe('5. Root Layout (layout.tsx) Integration', () => {
    const layoutPath = path.resolve(__dirname, '../apps/web/src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    it('M1-NAV-5.1: MobileNav is imported and rendered', () => {
      assert.ok(layoutContent.includes("import { MobileNav } from '../components/mobile-nav'"), 'layout.tsx must import MobileNav');
      assert.ok(layoutContent.includes('<MobileNav />') || layoutContent.includes('<MobileNav/>'), 'layout.tsx must render MobileNav');
    });

    it('M1-NAV-5.2: Root layout uses semantic design tokens', () => {
      assert.ok(layoutContent.includes('bg-surface-page'), 'layout.tsx must use bg-surface-page');
      assert.ok(layoutContent.includes('text-text-primary'), 'layout.tsx must use text-text-primary');
    });
  });

  // =========================================================================
  // 6. P1 & P2 CRITICAL SYSTEM PROTECTIONS
  // =========================================================================
  describe('6. P1 Search & P2 Branding System Integrity', () => {
    it('M1-NAV-6.1: P1 search components exist and are intact', () => {
      const smartAutocompletePath = path.resolve(__dirname, '../apps/web/src/components/ui/smart-autocomplete.tsx');
      const commandPalettePath = path.resolve(__dirname, '../apps/web/src/components/global-command-palette.tsx');
      assert.ok(fs.existsSync(smartAutocompletePath), 'smart-autocomplete.tsx must exist');
      assert.ok(fs.existsSync(commandPalettePath), 'global-command-palette.tsx must exist');
    });

    it('M1-NAV-6.2: P2 branding files exist and are intact', () => {
      const brandingStorePath = path.resolve(__dirname, '../apps/web/src/stores/branding-store.ts');
      const whatsappSharePath = path.resolve(__dirname, '../apps/web/src/lib/whatsapp-share.ts');
      const receiptPreviewPath = path.resolve(__dirname, '../apps/web/src/components/thermal-receipt-preview.tsx');
      const sharedWhatsappPath = path.resolve(__dirname, '../packages/shared-utils/src/whatsapp.ts');

      assert.ok(fs.existsSync(brandingStorePath), 'branding-store.ts must exist');
      assert.ok(fs.existsSync(whatsappSharePath), 'whatsapp-share.ts must exist');
      assert.ok(fs.existsSync(receiptPreviewPath), 'thermal-receipt-preview.tsx must exist');
      assert.ok(fs.existsSync(sharedWhatsappPath), 'shared-utils/whatsapp.ts must exist');
    });
  });
});
}
