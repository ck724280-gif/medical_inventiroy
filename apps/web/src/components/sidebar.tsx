'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  Truck,
  Receipt,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  MessageSquare,
  BarChart3,
  Settings,
  FileSpreadsheet,
  ClipboardList,
  ArrowLeftRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';
import { useUiStore } from '../stores/ui-store';
import { cn } from '../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string | null;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
      { label: 'POS Billing', href: '/pos', icon: ShoppingCart, permission: 'sale.create', highlight: true },
      { label: 'Cash Register', href: '/cash-register', icon: Wallet, permission: 'sale.create' },
      { label: 'Sales & Invoices', href: '/sales', icon: Receipt, permission: 'sale.view' },
      { label: 'Sales Returns', href: '/sales-returns', icon: RotateCcw, permission: 'sale.return' },
    ],
  },
  {
    title: 'INVENTORY',
    items: [
      { label: 'Medicines', href: '/medicines', icon: Pill, permission: 'medicine.view' },
      { label: 'Inventory & Batches', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
      { label: 'Stock Transfers', href: '/stock-transfers', icon: ArrowLeftRight, permission: 'inventory.transfer' },
      { label: 'Purchases', href: '/purchases', icon: Truck, permission: 'purchase.view' },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, permission: 'purchase.view' },
      { label: 'Opening / Closing Stock', href: '/import', icon: FileSpreadsheet, permission: 'inventory.adjust' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { label: 'Customers', href: '/customers', icon: Users, permission: 'customer.view' },
      { label: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'supplier.view' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { label: 'Expenses', href: '/expenses', icon: Wallet, permission: 'expense.view' },
      { label: 'Reports & Analytics', href: '/reports', icon: BarChart3, permission: 'report.view' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
  {
    title: 'SUPER ADMIN',
    items: [
      { label: 'Control Center', href: '/super-admin', icon: Building2, permission: 'super_admin.access' },
      { label: 'Branches', href: '/super-admin/branches', icon: Layers, permission: 'super_admin.access' },
      { label: 'Staff Directory', href: '/super-admin/staff', icon: Users, permission: 'super_admin.access' },
      { label: 'Org Reports', href: '/super-admin/reports', icon: BarChart3, permission: 'super_admin.access' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const { name: storeName, logo: storeLogo } = useBrandingStore();
  const {
    isMobileSidebarOpen,
    closeMobileSidebar,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUiStore();

  const sections = NAV_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((section) => section.items.length > 0);

  const renderSidebarContent = (isCollapsed: boolean, isMobile: boolean = false) => {
    const initials = user?.firstName
      ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
      : 'U';
    const roleName = user?.roles?.[0] || 'Cashier';
    const fullName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Guest User';

    return (
      <div className="flex flex-col h-full bg-surface-base text-text-primary border-r border-border-default transition-colors duration-200">
        {/* ── Brand Header ─────────────────────────────────── */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-border-default flex-shrink-0 transition-all duration-200',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm overflow-hidden border border-accent-subtle-border">
              {storeLogo ? (
                <img src={storeLogo} alt={storeName} className="w-full h-full object-contain p-0.5 bg-surface-base" />
              ) : (
                <span className="font-bold text-white text-base">
                  {storeName ? storeName.charAt(0).toUpperCase() : '+'}
                </span>
              )}
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm text-text-primary truncate tracking-tight">
                  {storeName || 'MedCare ERP'}
                </h1>
                <p className="text-[10px] font-mono uppercase tracking-wider text-accent-primary font-semibold">
                  Medical ERP &amp; POS
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobile && (
            <button
              onClick={closeMobileSidebar}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop Collapse Toggle in header when expanded */}
          {!isMobile && !isCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Navigation Links ──────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {sections.map((section, idx) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2.5 pb-1 pt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  {section.title}
                </div>
              ) : (
                idx > 0 && <div className="my-2 border-t border-border-subtle" />
              )}

              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && item.href !== '/super-admin' && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (isMobile) closeMobileSidebar();
                    }}
                    title={item.label}
                    className={cn(
                      'flex items-center rounded-xl text-xs font-medium transition-all duration-150 relative group',
                      isCollapsed
                        ? 'justify-center w-10 h-10 mx-auto'
                        : 'gap-3 px-3 py-2.5 w-full',
                      isActive
                        ? 'bg-accent-subtle text-accent-primary font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-secondary'
                      )}
                    />

                    {!isCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.highlight && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-accent-subtle text-accent-primary border border-accent-subtle-border">
                            POS
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Collapsed Toggle Button when collapsed ───────────── */}
        {!isMobile && isCollapsed && (
          <div className="p-2 border-t border-border-default flex justify-center">
            <button
              onClick={toggleSidebarCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-10 h-10 rounded-xl bg-surface-raised border border-border-default hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Footer User Section ───────────────────────────── */}
        <div
          className={cn(
            'border-t border-border-default flex items-center transition-all duration-200',
            isCollapsed ? 'p-2 justify-center' : 'p-3 gap-3'
          )}
        >
          <div
            title={`${fullName} (${roleName})`}
            className="w-8 h-8 rounded-full bg-accent-subtle border border-accent-subtle-border flex items-center justify-center font-bold text-xs text-accent-primary shrink-0"
          >
            {initials}
          </div>

          {!isCollapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {fullName}
              </p>
              <div className="flex items-center mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold bg-accent-subtle text-accent-primary border border-accent-subtle-border truncate">
                  {roleName}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 z-30 select-none transition-all duration-300',
          isSidebarCollapsed ? 'w-14' : 'w-60'
        )}
      >
        {renderSidebarContent(isSidebarCollapsed, false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={closeMobileSidebar}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-in-left">
            {renderSidebarContent(false, true)}
          </div>
        </div>
      )}
    </>
  );
}

