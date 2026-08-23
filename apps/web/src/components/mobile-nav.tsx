'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Boxes,
  MoreHorizontal,
  Pill,
  Truck,
  ClipboardList,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { cn } from '../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string | null;
  category?: string;
}

const PRIMARY_TABS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { label: 'POS', href: '/pos', icon: ShoppingCart, permission: 'sale.create' },
  { label: 'Sales', href: '/sales', icon: Receipt, permission: 'sale.view' },
  { label: 'Inventory', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
];

const MORE_ITEMS: NavItem[] = [
  { label: 'Medicines Master', href: '/medicines', icon: Pill, permission: 'medicine.view', category: 'Inventory' },
  { label: 'Purchases & Inward', href: '/purchases', icon: Truck, permission: 'purchase.view', category: 'Inventory' },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, permission: 'purchase.view', category: 'Inventory' },
  { label: 'Opening Stock / Import', href: '/import', icon: FileSpreadsheet, permission: 'inventory.adjust', category: 'Inventory' },
  { label: 'Sales Returns', href: '/sales-returns', icon: RotateCcw, permission: 'sale.return', category: 'Operations' },
  { label: 'Customers & Patients', href: '/customers', icon: Users, permission: 'customer.view', category: 'People' },
  { label: 'Suppliers & Vendors', href: '/suppliers', icon: Building2, permission: 'supplier.view', category: 'People' },
  { label: 'Expenses Ledger', href: '/expenses', icon: Wallet, permission: 'expense.view', category: 'Finance' },
  { label: 'Reports & Analytics', href: '/reports', icon: BarChart3, permission: 'report.view', category: 'Finance' },
  { label: 'ERP Settings', href: '/settings', icon: Settings, permission: 'settings.manage', category: 'Management' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { hasPermission, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close more drawer on navigation
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Return null if not mounted, not authenticated, or on login page
  if (!mounted || !isAuthenticated || pathname === '/login') {
    return null;
  }

  const isTabActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isPrimaryActive = PRIMARY_TABS.some((tab) => isTabActive(tab.href));
  const isMoreItemActive = MORE_ITEMS.some((item) => isTabActive(item.href));

  const filteredMoreItems = MORE_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* ── Slide-up Drawer for "More" ──────────────────────── */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMoreOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          />

          {/* Drawer Container */}
          <div
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
            className="relative z-10 bg-surface-base border-t border-border-default rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-fade-slide-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                <h3 className="font-bold text-sm text-text-primary">More Modules</h3>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Items */}
            <div className="overflow-y-auto px-4 py-3 space-y-1">
              {filteredMoreItems.map((item) => {
                const active = isTabActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-colors',
                      active
                        ? 'bg-accent-subtle text-accent-primary font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          active ? 'text-accent-primary' : 'text-text-muted'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.category && (
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          {item.category}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Navigation Bar ─────────────────────── */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-base border-t border-border-default h-14 select-none shadow-lg transition-colors duration-200"
      >
        <div className="grid grid-cols-5 h-full items-center px-1">
          {PRIMARY_TABS.map((tab) => {
            const active = isTabActive(tab.href);
            const Icon = tab.icon;
            const permitted = !tab.permission || hasPermission(tab.permission);

            if (!permitted) return null;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full rounded-lg transition-colors py-1',
                  active
                    ? 'text-accent-primary font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    active ? 'text-accent-primary' : 'text-text-muted'
                  )}
                />
                <span className="text-[10px] leading-none truncate">{tab.label}</span>
              </Link>
            );
          })}

          {/* More Tab Button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            aria-label="More modules"
            className={cn(
              'flex flex-col items-center justify-center gap-1 h-full rounded-lg transition-colors py-1',
              isMoreOpen || (isMoreItemActive && !isPrimaryActive)
                ? 'text-accent-primary font-semibold'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <MoreHorizontal
              className={cn(
                'w-5 h-5 shrink-0 transition-colors',
                isMoreOpen || (isMoreItemActive && !isPrimaryActive)
                  ? 'text-accent-primary'
                  : 'text-text-muted'
              )}
            />
            <span className="text-[10px] leading-none truncate">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
