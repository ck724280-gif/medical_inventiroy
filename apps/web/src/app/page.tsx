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
      <div className="h-screen flex items-center justify-center bg-obsidian-950 text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs font-mono tracking-wider animate-pulse text-cyan-300">
            LOADING WORKSPACE...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-obsidian-950 overflow-hidden text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-obsidian-950">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* ── Welcome & 3D Spatial Banner ──────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="rounded-2xl p-6 sm:p-7 relative overflow-hidden border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(7, 14, 24, 0.95) 0%, rgba(10, 22, 40, 0.90) 50%, rgba(8, 54, 80, 0.40) 100%)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Subtle glowing mesh backdrop */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-cyan-pulse" />
                  LIVE ERP &amp; POS ENGINE
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight text-white glow-text-cyan">
                  Pharmacy Operations &amp; Real-Time Intelligence
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  FEFO-enforced batch dispensing, automated expiry alerts, and high-speed POS billing.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/pos')}
                    className="px-4 py-2.5 btn-cyan rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Launch POS Billing (F1)
                  </button>
                  <button
                    onClick={() => router.push('/inventory')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-slate-200 hover:text-white bg-obsidian-800/80 hover:bg-obsidian-700/80 border border-cyan-900/40 hover:border-cyan-500/40"
                  >
                    View Inventory Batches
                  </button>
                </div>
              </div>

              {/* 3D Spatial Canvas from 3d-web-experience */}
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
              <div
                className="p-5 rounded-2xl border border-cyan-900/30 transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-0.5 group"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-200/60 uppercase tracking-wider">
                    Today's Sales
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {formatCurrency(summary?.todaySales || 0)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <span className="text-emerald-400 font-semibold">{summary?.todaySalesCount || 0}</span> completed invoices today
                  </p>
                </div>
              </div>

              {/* Today's Gross Profit */}
              <div
                className="p-5 rounded-2xl border border-cyan-900/30 transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-0.5 group"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-200/60 uppercase tracking-wider">
                    Gross Profit (Est.)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-cyan-300 tracking-tight">
                    {formatCurrency(summary?.todayGrossProfit || 0)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Based on batch purchase costs</p>
                </div>
              </div>

              {/* Stock Valuation */}
              <div
                className="p-5 rounded-2xl border border-cyan-900/30 transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-0.5 group"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-200/60 uppercase tracking-wider">
                    Stock Valuation
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {formatCurrency(summary?.currentStockValue || 0)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Across active branch batches</p>
                </div>
              </div>

              {/* Critical Stock Alerts */}
              <div
                className="p-5 rounded-2xl border border-cyan-900/30 transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-0.5 group"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-200/60 uppercase tracking-wider">
                    Attention Items
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-400">
                    {summary?.expiredStockCount || 0}
                  </span>
                  <span className="text-xs text-slate-400">Expired |</span>
                  <span className="text-xl font-bold text-amber-400">
                    {summary?.lowStockCount || 0}
                  </span>
                  <span className="text-xs text-slate-400">Low Stock</span>
                </div>
              </div>
            </motion.div>

            {/* ── Charts & Top Items Grid ─────────────────────────── */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* 7-Day Sales Trend Chart */}
              <div
                className="lg:col-span-2 p-5 rounded-2xl border border-cyan-900/30"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-white">7-Day Sales Performance Trend</h4>
                    <p className="text-[11px] text-cyan-400/70">Real-time revenue monitoring</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
                    Revenue (₹)
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary?.salesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 182, 212, 0.08)" />
                      <XAxis dataKey="date" stroke="#5a8ca8" fontSize={11} />
                      <YAxis stroke="#5a8ca8" fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                        contentStyle={{
                          backgroundColor: '#070e18',
                          borderColor: 'rgba(6, 182, 212, 0.3)',
                          borderRadius: '12px',
                          color: '#e2f4ff',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        dot={{ fill: '#06b6d4', r: 4, stroke: '#050a0f', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top 5 Dispensed Medicines */}
              <div
                className="p-5 rounded-2xl border border-cyan-900/30 flex flex-col"
                style={{
                  background: 'rgba(10, 22, 40, 0.65)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-white">Top Dispensed (30d)</h4>
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 space-y-2.5">
                  {summary?.topMedicines?.length > 0 ? (
                    summary.topMedicines.map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-900/20 hover:border-cyan-500/30 transition-all duration-200"
                        style={{ background: 'rgba(6, 182, 212, 0.03)' }}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-5 h-5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-slate-200 truncate">{item.name}</p>
                            <p className="text-[10px] text-cyan-400/60 font-mono">{item.sku}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 pl-2">
                          <p className="text-xs font-bold text-white">{item.totalQty} units</p>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            {formatCurrency(item.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500">
                      <p className="text-xs">No sales recorded yet.</p>
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
