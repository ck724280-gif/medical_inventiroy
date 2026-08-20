'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
  ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { useBrandingStore } from '../stores/branding-store';
import { cn } from '../lib/utils';

/* ─── Animation variants ─────────────────────────────────── */
const sidebarVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const navItemVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const { name: storeName, primaryColor } = useBrandingStore();

  const navItems = [
    { label: 'Dashboard',            href: '/',              icon: LayoutDashboard, permission: null },
    { label: 'POS Billing',          href: '/pos',           icon: ShoppingCart,    permission: 'sale.create',      highlight: true },
    { label: 'Medicines',            href: '/medicines',     icon: Pill,            permission: 'medicine.view' },
    { label: 'Inventory & Batches',  href: '/inventory',     icon: Boxes,           permission: 'inventory.view' },
    { label: 'Purchases',            href: '/purchases',     icon: Truck,           permission: 'purchase.view' },
    { label: 'Purchase Orders',      href: '/purchase-orders', icon: ClipboardList, permission: 'purchase.view' },
    { label: 'Sales & Invoices',     href: '/sales',         icon: Receipt,         permission: 'sale.view' },
    { label: 'Sales Returns',        href: '/sales-returns', icon: RotateCcw,       permission: 'sale.return' },
    { label: 'Suppliers',            href: '/suppliers',     icon: Building2,       permission: 'supplier.view' },
    { label: 'Customers',            href: '/customers',     icon: Users,           permission: 'customer.view' },
    { label: 'Expenses',             href: '/expenses',      icon: Wallet,          permission: 'expense.view' },
    { label: 'Reports & Analytics',  href: '/reports',       icon: BarChart3,       permission: 'report.view' },
    { label: 'Opening Stock / Import', href: '/import',      icon: FileSpreadsheet, permission: 'inventory.adjust' },
    { label: 'Settings',             href: '/settings',      icon: Settings,        permission: 'settings.manage' },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className="w-64 flex flex-col flex-shrink-0 h-screen sticky top-0 select-none"
      style={{
        background: 'rgba(5, 10, 15, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(6, 182, 212, 0.12)',
      }}
    >
      {/* ── Brand Header ─────────────────────────────────── */}
      <div
        className="h-16 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.10)' }}
      >
        {/* Logo badge with pulse ring */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 flex-shrink-0 animate-pulse-ring"
          style={{
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.45)',
          }}
        >
          +
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-sm truncate tracking-tight" style={{ color: '#e2f4ff' }}>
            {storeName}
          </h1>
          <p
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: '#06b6d4' }}
          >
            ERP &amp; POS
          </p>
        </div>
      </div>

      {/* ── Navigation Links ──────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <motion.ul
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0.5 list-none m-0 p-0"
        >
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <motion.li key={item.href} variants={navItemVariants}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-250 will-change-transform relative group',
                    isActive
                      ? 'text-white'
                      : 'hover:text-[#e2f4ff]'
                  )}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(90deg, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.08) 100%)',
                          borderLeft: '2px solid #06b6d4',
                          boxShadow: '0 0 12px rgba(6, 182, 212, 0.15)',
                          color: '#22d3ee',
                          paddingLeft: '10px',
                        }
                      : item.highlight
                      ? {
                          background: 'rgba(6, 182, 212, 0.06)',
                          border: '1px solid rgba(6, 182, 212, 0.20)',
                          color: '#67e8f9',
                        }
                      : { color: '#5a8ca8' }
                  }
                >
                  {/* Hover background */}
                  {!isActive && (
                    <span
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                      style={{ background: 'rgba(6, 182, 212, 0.06)' }}
                    />
                  )}

                  <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                  <span className="truncate relative z-10">{item.label}</span>

                  {item.highlight && (
                    <span
                      className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-bold relative z-10 flex-shrink-0"
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#22d3ee',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                      }}
                    >
                      HOT
                    </span>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* ── User Badge ───────────────────────────────────── */}
      {user && (
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(6, 182, 212, 0.10)' }}
        >
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-250 cursor-default"
            style={{ background: 'rgba(6, 182, 212, 0.04)' }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1.5px solid rgba(6, 182, 212, 0.4)',
                color: '#22d3ee',
                boxShadow: '0 0 8px rgba(6, 182, 212, 0.2)',
              }}
            >
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="overflow-hidden text-xs">
              <p className="font-semibold truncate" style={{ color: '#e2f4ff' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider truncate" style={{ color: '#5a8ca8' }}>
                {user.roles?.[0] || 'User'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
