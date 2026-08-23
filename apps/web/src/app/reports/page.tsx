'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Boxes,
  Receipt,
  FileText,
  ShieldAlert,
  Download,
  Loader2,
  RefreshCw,
  IndianRupee,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function ReportsPage() {
  const { selectedBranchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    'financials' | 'sales' | 'inventory' | 'gstr1' | 'gstr3b' | 'hsn' | 'schedule-h'
  >('financials');

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [downloading, setDownloading] = useState<string | null>(null);

  // Date Presets Helper
  const setPreset = (preset: 'today' | 'week' | 'month' | 'lastMonth' | 'fy') => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setDateRange({ startDate: endStr, endDate: endStr });
    } else if (preset === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setDateRange({ startDate: d.toISOString().split('T')[0], endDate: endStr });
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ startDate: start.toISOString().split('T')[0], endDate: endStr });
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setDateRange({ startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
    } else if (preset === 'fy') {
      const currentYear = today.getFullYear();
      const isPostApril = today.getMonth() >= 3;
      const startYear = isPostApril ? currentYear : currentYear - 1;
      const start = new Date(startYear, 3, 1);
      setDateRange({ startDate: start.toISOString().split('T')[0], endDate: endStr });
    }
  };

  // Financial Summary Query
  const { data: financialData, isLoading: loadingFinancials, refetch: refetchFinancials } = useQuery({
    queryKey: ['financial-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/financial-summary', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'financials',
  });

  // Sales Report Query
  const { data: salesReportData, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/sales', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'sales',
  });

  // Inventory Valuation Query
  const { data: inventoryValuation, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-valuation', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/inventory', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'inventory',
  });

  // GSTR-1 Query
  const { data: gstr1Data, isLoading: loadingGstr1 } = useQuery({
    queryKey: ['gstr1-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/gstr1', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'gstr1',
  });

  // GSTR-3B Query
  const { data: gstr3bData, isLoading: loadingGstr3b } = useQuery({
    queryKey: ['gstr3b-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/gstr3b', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'gstr3b',
  });

  // HSN Summary Query
  const { data: hsnData, isLoading: loadingHsn } = useQuery({
    queryKey: ['hsn-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/hsn-summary', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'hsn',
  });

  // Schedule H Register Query
  const { data: scheduleHData, isLoading: loadingScheduleH } = useQuery({
    queryKey: ['schedule-h-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/schedule-h', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'schedule-h',
  });

  const handleExportExcel = async (type: string, filename: string) => {
    try {
      setDownloading(type);
      const res = await apiClient.get(`/reports/${type}/export/excel`, {
        params: {
          branchId: selectedBranchId || undefined,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex h-screen bg-surface-page text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Header & Date Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-primary" />
                Reports &amp; Legal Analytics
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Financial P&amp;L, GST Returns (GSTR-1, GSTR-3B), HSN Summaries, and Schedule H / H1 Drug Registers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Presets */}
              <div className="flex items-center gap-1 bg-surface-base p-1 rounded-xl border border-border-default text-[11px] shadow-sm">
                <button
                  onClick={() => setPreset('today')}
                  className="px-2 py-1 hover:bg-surface-raised rounded-lg text-text-muted font-medium transition"
                >
                  Today
                </button>
                <button
                  onClick={() => setPreset('week')}
                  className="px-2 py-1 hover:bg-surface-raised rounded-lg text-text-muted font-medium transition"
                >
                  7D
                </button>
                <button
                  onClick={() => setPreset('month')}
                  className="px-2 py-1 hover:bg-surface-raised rounded-lg text-text-muted font-medium transition"
                >
                  This Month
                </button>
                <button
                  onClick={() => setPreset('lastMonth')}
                  className="px-2 py-1 hover:bg-surface-raised rounded-lg text-text-muted font-medium transition"
                >
                  Last Month
                </button>
                <button
                  onClick={() => setPreset('fy')}
                  className="px-2 py-1 hover:bg-surface-raised rounded-lg text-accent-primary font-semibold transition"
                >
                  FY
                </button>
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-2 bg-surface-base p-1.5 px-3 rounded-xl border border-border-default shadow-sm text-xs">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="bg-surface-page border border-border-default text-text-primary rounded-lg px-2 py-1 focus:outline-none text-xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="bg-surface-page border border-border-default text-text-primary rounded-lg px-2 py-1 focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-border-default gap-1.5">
            {[
              { id: 'financials', label: 'P&L Summary', icon: TrendingUp },
              { id: 'sales', label: 'Sales Ledger', icon: Receipt },
              { id: 'inventory', label: 'Inventory Valuation', icon: Boxes },
              { id: 'gstr1', label: 'GSTR-1 (Outward)', icon: FileText },
              { id: 'gstr3b', label: 'GSTR-3B (Tax Return)', icon: FileSpreadsheet },
              { id: 'hsn', label: 'HSN Code Summary', icon: FileText },
              { id: 'schedule-h', label: 'Schedule H / H1 Register', icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
                    isActive
                      ? 'bg-surface-base text-accent-primary border-sky-600 dark:border-sky-400 shadow-sm'
                      : 'text-text-muted border-transparent hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Financials P&L */}
          {activeTab === 'financials' && (
            <div className="space-y-5">
              {loadingFinancials ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Calculating P&amp;L Financial metrics...
                </div>
              ) : financialData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm">
                      <span className="text-[11px] text-text-muted font-semibold">Gross Revenue</span>
                      <h3 className="text-xl font-bold font-mono text-text-primary mt-1">
                        {formatCurrency(financialData.totalRevenue || financialData.grossSales || 0)}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">
                        From {financialData.totalInvoices || 0} completed invoices
                      </p>
                    </div>

                    <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm">
                      <span className="text-[11px] text-text-muted font-semibold">Cost of Goods Sold (COGS)</span>
                      <h3 className="text-xl font-bold font-mono text-text-primary mt-1">
                        {formatCurrency(financialData.cogs || 0)}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Direct inventory purchase cost</p>
                    </div>

                    <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm">
                      <span className="text-[11px] text-text-muted font-semibold">Operating Expenses</span>
                      <h3 className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
                        {formatCurrency(financialData.totalExpenses || 0)}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Rent, electricity, salary, etc.</p>
                    </div>

                    <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm">
                      <span className="text-[11px] text-text-muted font-semibold">Net Profit Estimate</span>
                      <h3 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatCurrency(financialData.netProfitEstimate || 0)}
                      </h3>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 font-mono">
                        Margin: {financialData.profitMargin || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Summary Breakdown Card */}
                  <div className="p-5 bg-surface-base rounded-2xl border border-border-default shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-accent-primary" />
                      Detailed P&amp;L Financial Breakdown
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Gross Sales Revenue (+)</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(financialData.grossSales || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Sales Returns / Refunds (-)</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(financialData.totalReturns || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Net Sales Revenue</span>
                        <span className="font-mono font-bold text-accent-primary">
                          {formatCurrency(financialData.netRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Cost of Goods Sold (COGS) (-)</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(financialData.cogs || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Gross Margin Profit</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(financialData.grossProfit || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-text-muted">Operational Expenses Payouts (-)</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(financialData.totalExpenses || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 bg-slate-50 dark:bg-slate-900/50 px-2 rounded-lg font-bold">
                        <span className="text-text-primary">Net Business Profit</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(financialData.netProfitEstimate || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 2: Sales Ledger */}
          {activeTab === 'sales' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Sales Invoices Ledger</h3>
                  <p className="text-xs text-text-muted">
                    Total Invoices: {salesReportData?.summary?.totalInvoices || 0} | Total Value:{' '}
                    <b className="font-mono text-accent-primary">
                      {formatCurrency(salesReportData?.summary?.totalSalesAmount || 0)}
                    </b>
                  </p>
                </div>
                <button
                  onClick={() => handleExportExcel('sales', 'sales-report.xlsx')}
                  disabled={downloading === 'sales'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'sales' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Sales Excel (.xlsx)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {loadingSales ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Loading sales ledger...
                        </td>
                      </tr>
                    ) : (salesReportData?.sales || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No sales recorded in this date range.
                        </td>
                      </tr>
                    ) : (
                      salesReportData.sales.map((s: any) => (
                        <tr key={s.id} className="hover:bg-surface-raised">
                          <td className="py-2.5 px-3 font-mono font-bold text-accent-primary">{s.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-text-muted font-mono">{formatDate(s.createdAt)}</td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary">{s.customer?.name || 'Walk-in'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(s.subtotal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(s.taxAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-600">{formatCurrency(s.discountAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                            {formatCurrency(s.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Inventory Valuation */}
          {activeTab === 'inventory' && (
            <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Live Inventory Valuation</h3>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs">
                    <div>
                      <span className="text-text-muted">Total Items: </span>
                      <span className="font-bold font-mono text-text-primary">
                        {inventoryValuation?.summary?.totalMedicines || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Purchase Value: </span>
                      <span className="font-bold font-mono text-accent-primary">
                        {formatCurrency(inventoryValuation?.summary?.totalPurchaseValuation || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">MRP Retail Value: </span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inventoryValuation?.summary?.totalMrpValuation || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Potential Gross Profit: </span>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(inventoryValuation?.summary?.potentialProfit || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleExportExcel('inventory', 'inventory-valuation.xlsx')}
                  disabled={downloading === 'inventory'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'inventory' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download Inventory Excel (.xlsx)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-surface-raised text-text-muted font-semibold border-b border-border-default text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Stock Qty</th>
                      <th className="py-2.5 px-3 text-right">Purchase Cost (₹)</th>
                      <th className="py-2.5 px-3 text-right">MRP Retail (₹)</th>
                      <th className="py-2.5 px-3 text-right">Margin Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {loadingInventory ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Valuating stock across batches...
                        </td>
                      </tr>
                    ) : (inventoryValuation?.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No active stock found in inventory.
                        </td>
                      </tr>
                    ) : (
                      inventoryValuation.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-surface-raised">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-text-primary">{item.name}</div>
                            {item.genericName && (
                              <div className="text-[10px] text-slate-400">{item.genericName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-text-muted">{item.category}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-text-primary">
                            {item.stock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                            {formatCurrency(item.purchaseValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.mrpValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-accent-primary">
                            {formatCurrency(item.mrpValue - item.purchaseValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GSTR-1 */}
          {activeTab === 'gstr1' && (
            <div className="space-y-4">
              <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">GSTR-1 Outward Supplies Summary</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-text-muted">B2B Taxable: </span>
                      <span className="font-bold font-mono text-text-primary">
                        {formatCurrency(gstr1Data?.summary?.totalB2bTaxable || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">B2C Retail: </span>
                      <span className="font-bold font-mono text-text-primary">
                        {formatCurrency(gstr1Data?.summary?.totalB2cTaxable || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Total Tax Liability: </span>
                      <span className="font-bold font-mono text-accent-primary">
                        {formatCurrency(gstr1Data?.summary?.grandTotalTax || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleExportExcel('gstr1', 'gstr1-report.xlsx')}
                  disabled={downloading === 'gstr1'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'gstr1' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download GSTR-1 Excel (.xlsx)
                </button>
              </div>

              {/* B2B Invoices Table */}
              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm overflow-hidden p-4 space-y-3">
                <h4 className="font-bold text-xs text-text-primary">
                  B2B Invoices (With Registered Customer GSTIN)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1322] text-text-muted font-semibold border-b border-border-default">
                      <tr>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value</th>
                        <th className="py-2.5 px-3 text-right">CGST</th>
                        <th className="py-2.5 px-3 text-right">SGST</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingGstr1 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Loading GSTR-1 records...
                          </td>
                        </tr>
                      ) : (gstr1Data?.b2b || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No B2B registered sales found in this period.
                          </td>
                        </tr>
                      ) : (
                        gstr1Data.b2b.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-raised">
                            <td className="py-2 px-3 font-mono text-accent-primary font-bold">{row.gstin}</td>
                            <td className="py-2 px-3 text-text-primary">{row.customerName}</td>
                            <td className="py-2 px-3 font-mono text-text-secondary">{row.invoiceNumber}</td>
                            <td className="py-2 px-3 font-mono text-text-muted">{formatDate(row.date)}</td>
                            <td className="py-2 px-3 text-right font-mono text-text-primary">
                              {formatCurrency(row.taxableValue)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-text-muted">{formatCurrency(row.cgst)}</td>
                            <td className="py-2 px-3 text-right font-mono text-text-muted">{formatCurrency(row.sgst)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-text-primary">
                              {formatCurrency(row.invoiceValue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GSTR-3B */}
          {activeTab === 'gstr3b' && (
            <div className="space-y-4">
              <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">GSTR-3B Monthly Return Summary</h3>
                  <p className="text-xs text-text-muted">
                    Output tax on outward supplies vs Input Tax Credit (ITC) on inward purchases.
                  </p>
                </div>
                <button
                  onClick={() => handleExportExcel('gstr3b', 'gstr3b-report.xlsx')}
                  disabled={downloading === 'gstr3b'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'gstr3b' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download GSTR-3B Excel (.xlsx)
                </button>
              </div>

              {loadingGstr3b ? (
                <div className="py-12 text-center text-slate-400">Compiling GSTR-3B return tables...</div>
              ) : gstr3bData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm space-y-3">
                    <h4 className="font-bold text-xs text-text-primary">3.1 Outward Taxable Supplies (Sales)</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">Total Taxable Value:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.outwardSupplies?.taxableValue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">CGST (Central Tax):</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.outwardSupplies?.cgst || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">SGST (State Tax):</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.outwardSupplies?.sgst || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-accent-primary">
                        <span>Total Output Tax:</span>
                        <span className="font-mono">{formatCurrency(gstr3bData.outwardSupplies?.totalTax || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm space-y-3">
                    <h4 className="font-bold text-xs text-text-primary">4. Eligible Input Tax Credit (Purchases)</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">ITC Taxable Value:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.eligibleItc?.taxableValue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">ITC CGST:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.eligibleItc?.cgst || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-text-muted">ITC SGST:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatCurrency(gstr3bData.eligibleItc?.sgst || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <span>Net GST Payable:</span>
                        <span className="font-mono">{formatCurrency(gstr3bData.netGstPayable?.totalNetPayable || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 6: HSN Summary */}
          {activeTab === 'hsn' && (
            <div className="space-y-4">
              <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">HSN Code-wise Outward Tax Summary</h3>
                  <p className="text-xs text-text-muted">
                    Summary of medicine sales categorized by HSN codes and GST slab rates.
                  </p>
                </div>
                <button
                  onClick={() => handleExportExcel('hsn-summary', 'hsn-summary.xlsx')}
                  disabled={downloading === 'hsn-summary'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'hsn-summary' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download HSN Summary Excel (.xlsx)
                </button>
              </div>

              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1322] text-text-muted font-semibold border-b border-border-default">
                      <tr>
                        <th className="py-2.5 px-3">HSN Code</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-center">Total Qty</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value</th>
                        <th className="py-2.5 px-3 text-center">Tax Rate</th>
                        <th className="py-2.5 px-3 text-right">CGST</th>
                        <th className="py-2.5 px-3 text-right">SGST</th>
                        <th className="py-2.5 px-3 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingHsn ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Loading HSN breakdown...
                          </td>
                        </tr>
                      ) : (hsnData?.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No HSN data found for this period.
                          </td>
                        </tr>
                      ) : (
                        hsnData.items.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-raised">
                            <td className="py-2.5 px-3 font-mono font-bold text-accent-primary">{row.hsnCode}</td>
                            <td className="py-2.5 px-3 text-text-primary">{row.description}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-text-primary">
                              {row.totalQty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-text-primary">
                              {formatCurrency(row.taxableValue)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-text-secondary">
                              {row.taxPercent}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(row.cgst)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(row.sgst)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                              {formatCurrency(row.totalValue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Schedule H / H1 Register */}
          {activeTab === 'schedule-h' && (
            <div className="space-y-4">
              <div className="bg-surface-base p-5 rounded-2xl border border-border-default shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                    Schedule H / H1 / X Controlled Drug Inspection Register
                  </h3>
                  <p className="text-xs text-text-muted">
                    Statutory medical register with Doctor Details, Patient Info, Batch &amp; Expiry records for drug inspectors.
                  </p>
                </div>
                <button
                  onClick={() => handleExportExcel('schedule-h', 'schedule-h-register.xlsx')}
                  disabled={downloading === 'schedule-h'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition active:scale-95"
                >
                  {downloading === 'schedule-h' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Drug Register (.xlsx)
                </button>
              </div>

              <div className="bg-surface-base rounded-2xl border border-border-default shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1322] text-text-muted font-semibold border-b border-border-default">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Patient Name &amp; Age</th>
                        <th className="py-2.5 px-3">Doctor Name &amp; Reg #</th>
                        <th className="py-2.5 px-3">Drug Dispensed</th>
                        <th className="py-2.5 px-3">Schedule</th>
                        <th className="py-2.5 px-3">Batch &amp; Expiry</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 font-mono">Invoice #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingScheduleH ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Loading prescription records...
                          </td>
                        </tr>
                      ) : (scheduleHData?.records || []).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No Schedule H/H1 dispensed records found in this timeframe.
                          </td>
                        </tr>
                      ) : (
                        scheduleHData.records.map((rec: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-raised">
                            <td className="py-2.5 px-3 font-mono text-text-muted">
                              {formatDate(rec.dispensedAt)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-text-primary block">{rec.patientName}</span>
                              <span className="text-[10px] text-slate-400">Age: {rec.patientAge || '—'} yrs</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-text-primary block">{rec.doctorName}</span>
                              <span className="text-[10px] font-mono text-accent-primary">
                                Reg: {rec.doctorRegNo || 'N/A'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-text-primary">
                              {rec.items?.map((item: any) => item.medicineName).join(', ') || 'Controlled Drug'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded font-bold text-[10px]">
                                {rec.drugSchedule || 'SCHEDULE_H'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-text-muted">
                              {rec.items
                                ?.map((item: any) => `B:${item.batchNumber} (Exp:${item.expiryDate ? formatDate(item.expiryDate) : 'N/A'})`)
                                .join(' | ')}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono text-text-primary">
                              {rec.items?.reduce((sum: number, it: any) => sum + (it.qty || 0), 0) || 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-accent-primary">
                              {rec.invoiceNumber}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

