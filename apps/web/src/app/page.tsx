'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Pill,
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

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, selectedBranchId } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: summary, isLoading: dataLoading } = useQuery({
    queryKey: ['dashboard-summary', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/summary', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-sm animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Welcome & 3D Spatial Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between border border-slate-800 relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-300 text-xs font-mono font-medium">
                LIVE ERP & POS ENGINE
              </span>
              <h2 className="text-2xl font-bold mt-2 tracking-tight">
                Pharmacy Operations & Real-Time Intelligence
              </h2>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                FEFO-enforced batch dispensing, automated expiry alerts, and high-speed POS billing.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.push('/pos')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/30 transition"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Launch POS Billing (F1)
                </button>
                <button
                  onClick={() => router.push('/inventory')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                >
                  View Inventory Batches
                </button>
              </div>
            </div>

            {/* 3D Spatial Canvas from 3d-web-experience */}
            <div className="hidden md:flex items-center pr-4">
              <SpatialMedicalCanvas />
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Today's Sales
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900">
                  {formatCurrency(summary?.todaySales || 0)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {summary?.todaySalesCount || 0} completed invoices today
                </p>
              </div>
            </div>

            {/* Today's Gross Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Gross Profit (Est.)
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-sky-700">
                  {formatCurrency(summary?.todayGrossProfit || 0)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Based on batch purchase costs</p>
              </div>
            </div>

            {/* Stock Valuation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock Valuation
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900">
                  {formatCurrency(summary?.currentStockValue || 0)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Across active branch batches</p>
              </div>
            </div>

            {/* Critical Stock Alerts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Attention Items
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {summary?.expiredStockCount || 0}
                </span>
                <span className="text-xs text-slate-500">Expired |</span>
                <span className="text-lg font-bold text-amber-600">
                  {summary?.lowStockCount || 0}
                </span>
                <span className="text-xs text-slate-500">Low Stock</span>
              </div>
            </div>
          </div>

          {/* Charts & Top Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Sales Trend Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-slate-800">7-Day Sales Performance Trend</h4>
                <span className="text-xs text-slate-500">Revenue (₹)</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary?.salesTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#0284c7"
                      strokeWidth={3}
                      dot={{ fill: '#0284c7', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Dispensed Medicines */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h4 className="font-bold text-sm text-slate-800 mb-3">Top Selling Medicines (30d)</h4>
              <div className="flex-1 space-y-3">
                {summary?.topMedicines?.length > 0 ? (
                  summary.topMedicines.map((item: any, idx: number) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-900">{item.totalQty} units</p>
                        <p className="text-[10px] text-emerald-600 font-medium">
                          {formatCurrency(item.totalRevenue)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-10">No sales records yet.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
