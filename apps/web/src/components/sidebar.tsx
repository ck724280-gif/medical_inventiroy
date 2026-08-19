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
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';
import { cn } from '../lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const { name: storeName, primaryColor } = useBrandingStore();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
    { label: 'POS Billing', href: '/pos', icon: ShoppingCart, permission: 'sale.create', highlight: true },
    { label: 'Medicines', href: '/medicines', icon: Pill, permission: 'medicine.view' },
    { label: 'Inventory & Batches', href: '/inventory', icon: Boxes, permission: 'inventory.view' },
    { label: 'Purchases', href: '/purchases', icon: Truck, permission: 'purchase.view' },
    { label: 'Sales & Invoices', href: '/sales', icon: Receipt, permission: 'sale.view' },
    { label: 'Sales Returns', href: '/sales-returns', icon: RotateCcw, permission: 'sale.return' },
    { label: 'Suppliers', href: '/suppliers', icon: Building2, permission: 'supplier.view' },
    { label: 'Customers', href: '/customers', icon: Users, permission: 'customer.view' },
    { label: 'Expenses', href: '/expenses', icon: Wallet, permission: 'expense.view' },
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3, permission: 'report.view' },
    { label: 'Opening Stock / Import', href: '/import', icon: FileSpreadsheet, permission: 'inventory.adjust' },
    { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings.manage' },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-md mr-3 flex-shrink-0">
          +
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white text-sm truncate tracking-tight">
            {storeName}
          </h1>
          <p className="text-xs text-sky-400 font-mono uppercase tracking-wider">ERP & POS</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80',
                item.highlight && !isActive && 'text-sky-300 bg-sky-950/30 border border-sky-800/50'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.highlight && (
                <span className="ml-auto text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                  HOT
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Badge */}
      {user && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-sky-900 border border-sky-700 flex items-center justify-center text-sky-200 font-bold text-xs">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="overflow-hidden text-xs">
              <p className="font-medium text-slate-200 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                {user.roles?.[0] || 'User'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
