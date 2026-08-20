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
  BarChart3,
  Settings,
  FileSpreadsheet,
  ClipboardList,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';
import { useUiStore } from '../stores/ui-store';
import { cn } from '../lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const { name: storeName } = useBrandingStore();
  const { isMobileSidebarOpen, closeMobileSidebar } = useUiStore();

  const navItems = [
    { label: 'Dashboard',            href: '/',                icon: LayoutDashboard, permission: null },
    { label: 'POS Billing',          href: '/pos',             icon: ShoppingCart,    permission: 'sale.create', highlight: true },
    { label: 'Medicines',            href: '/medicines',       icon: Pill,            permission: 'medicine.view' },
    { label: 'Inventory & Batches',  href: '/inventory',       icon: Boxes,           permission: 'inventory.view' },
    { label: 'Purchases',            href: '/purchases',       icon: Truck,           permission: 'purchase.view' },
    { label: 'Purchase Orders',      href: '/purchase-orders', icon: ClipboardList,   permission: 'purchase.view' },
    { label: 'Sales & Invoices',     href: '/sales',           icon: Receipt,         permission: 'sale.view' },
    { label: 'Sales Returns',        href: '/sales-returns',   icon: RotateCcw,       permission: 'sale.return' },
    { label: 'Suppliers',            href: '/suppliers',       icon: Building2,       permission: 'supplier.view' },
    { label: 'Customers',            href: '/customers',       icon: Users,           permission: 'customer.view' },
    { label: 'Expenses',             href: '/expenses',        icon: Wallet,          permission: 'expense.view' },
    { label: 'Reports & Analytics',  href: '/reports',         icon: BarChart3,       permission: 'report.view' },
    { label: 'Opening Stock / Import', href: '/import',        icon: FileSpreadsheet, permission: 'inventory.adjust' },
    { label: 'Settings',             href: '/settings',        icon: Settings,        permission: 'settings.manage' },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#090d16] text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* ── Brand Header ─────────────────────────────────── */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
            +
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-slate-900 dark:text-white truncate tracking-tight">
              {storeName}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
              Medical ERP &amp; POS
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Navigation Links ──────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileSidebar}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 relative group',
                isActive
                  ? 'bg-sky-50 dark:bg-slate-800/90 text-sky-600 dark:text-sky-400 font-semibold border-l-2 border-sky-500 pl-2.5 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition',
                  isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                )}
              />
              <span className="truncate">{item.label}</span>

              {item.highlight && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/20 dark:border-sky-500/30">
                  POS
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer User Tag ───────────────────────────────── */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-sky-600 dark:text-sky-400">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase font-semibold">
            {user?.roles?.[0] || 'Cashier'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 h-screen sticky top-0 z-30 select-none">
        {sidebarContent}
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
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
