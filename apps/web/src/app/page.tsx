'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Sidebar } from '../components/sidebar';
import { Header } from '../components/header';
import { SpatialMedicalCanvas } from '../components/spatial-canvas';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { useThemeStore } from '../stores/theme-store';
import { formatCurrency } from '@medical-inventory/shared-utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, selectedBranchId } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/summary', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data || {};
    },
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] text-sky-600 dark:text-sky-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <p className="text-xs font-mono tracking-wider animate-pulse text-sky-600 dark:text-sky-400">
            LOADING WORKSPACE...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* ── Welcome & Spatial Banner ──────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl p-6 sm:p-7 relative overflow-hidden border border-sky-200 dark:border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-sky-600/5 to-transparent dark:from-[#0c1a2e] dark:via-[#0f243d] dark:to-[#081b2a] shadow-sm dark:shadow-xl flex items-center justify-between"
            >
              <div className="relative z-10 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-[11px] font-mono font-semibold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  LIVE PHARMACY ERP &amp; POS
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight text-slate-900 dark:text-white">
                  Pharmacy Intelligence &amp; Counter Sales
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  FEFO-enforced batch dispensing, automated expiry alerts, and high-speed POS billing.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/pos')}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Launch POS Counter (F1)
                  </button>
                  <button
                    onClick={() => router.push('/inventory')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500"
                  >
                    View Inventory Batches
                  </button>
                </div>
              </div>

              {/* 3D Spatial Canvas */}
              <div className="hidden md:flex items-center pr-2 relative z-10">
                <SpatialMedicalCanvas />
              </div>
            </motion.div>

            {/* ── Metric Cards Grid ─────────────────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Today's Sales */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all duration-200 hover:border-sky-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Today's Sales
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {formatCurrency(summary?.todaySales || 0)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{summary?.todaySalesCount || 0}</span> invoices today
                  </p>
                </div>
              </div>

              {/* Today's Gross Profit */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all duration-200 hover:border-sky-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Gross Profit (Est.)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 tracking-tight">
                    {formatCurrency(summary?.todayGrossProfit || 0)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Based on batch purchase costs</p>
                </div>
              </div>

              {/* Stock Valuation */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all duration-200 hover:border-sky-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Stock Valuation
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {formatCurrency(summary?.currentStockValue || 0)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across active branch batches</p>
                </div>
              </div>

              {/* Critical Stock Alerts */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all duration-200 hover:border-sky-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Attention Items
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary?.expiredStockCount || 0}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Expired |</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {summary?.lowStockCount || 0}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Low Stock</span>
                </div>
              </div>
            </motion.div>

            {/* ── Charts & Top Items Grid ─────────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* 7-Day Sales Trend Chart */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">7-Day Sales Performance Trend</h4>
                    <p className="text-[11px] text-sky-600 dark:text-sky-400">Real-time revenue monitoring</p>
                  </div>
                  <span className="text-xs font-mono text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700">
                    Revenue (₹)
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary?.salesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={11} />
                      <YAxis stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                          borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                          borderRadius: '12px',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#0284c7"
                        strokeWidth={3}
                        dot={{ fill: '#0284c7', r: 4, stroke: theme === 'dark' ? '#090d16' : '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top 5 Dispensed Medicines */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Top Moving Medicines</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Fastest selling inventory</p>
                  </div>
                  <Package className="w-4 h-4 text-slate-400" />
                </div>

                <div className="flex-1 flex flex-col justify-center divide-y divide-slate-100 dark:divide-slate-800/60">
                  {summary?.topMedicines?.length > 0 ? (
                    summary.topMedicines.slice(0, 5).map((med: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                              {med.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{med.sku}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{med.quantitySold} sold</p>
                          <p className="text-[10px] text-slate-400">{formatCurrency(med.totalRevenue || 0)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No sales data recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
