'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Boxes,
  Calendar,
  Download,
  Receipt,
  Wallet,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function ReportsPage() {
  const { selectedBranchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'financial' | 'sales' | 'purchases' | 'inventory'>('financial');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Financial Summary Query
  const { data: financialData, isLoading: finLoading } = useQuery({
    queryKey: ['financial-summary', selectedBranchId, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/financials/summary', {
        params: {
          branchId: selectedBranchId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res.data;
    },
    enabled: activeTab === 'financial',
  });

  // 2. Sales Report Query
  const { data: salesReportData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', selectedBranchId, startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/sales', {
        params: {
          branchId: selectedBranchId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res.data;
    },
    enabled: activeTab === 'sales',
  });

  // 3. Inventory Valuation Query
  const { data: inventoryValuation, isLoading: invLoading } = useQuery({
    queryKey: ['inventory-valuation', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/inventory', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data;
    },
    enabled: activeTab === 'inventory',
  });

  const handleExportInventoryExcel = () => {
    const url = `/api/reports/inventory/export/excel${selectedBranchId ? `?branchId=${selectedBranchId}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Business Analytics</h2>
              <p className="text-xs text-slate-500">
                P&L statements, gross margin calculations, sales/purchase ledger breakdown, and Excel exports.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'financial' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                P&L Summary
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'sales' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales Ledger
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'inventory' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inventory Valuation
              </button>
            </div>
          </div>

          {/* TAB 1: Financial & P&L Summary */}
          {activeTab === 'financial' && financialData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Gross Revenue</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {formatCurrency(financialData.revenue)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Total completed billing</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Cost of Goods (COGS)</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {formatCurrency(financialData.cogs)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Actual batch purchase costs</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-700 uppercase">Gross Profit</span>
                  <h3 className="text-2xl font-bold text-emerald-700 mt-2">
                    {formatCurrency(financialData.grossProfit)}
                  </h3>
                  <p className="text-[11px] text-emerald-600 mt-1">
                    Margin: {financialData.grossProfitMargin.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-sky-700 uppercase">Net Profit (Est.)</span>
                  <h3 className="text-2xl font-bold text-sky-700 mt-2">
                    {formatCurrency(financialData.netProfitEstimate)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Expenses: {formatCurrency(financialData.expenses)}
                  </p>
                </div>
              </div>

              {/* GST Tax Summary Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-sm text-slate-800 mb-3">GST Tax Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block">Output GST Collected (Sales):</span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {formatCurrency(financialData.taxSummary.outputGstCollected)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 block">Input GST Paid (Purchases):</span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {formatCurrency(financialData.taxSummary.inputGstPaid)}
                    </span>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl">
                    <span className="text-sky-700 font-medium block">Net Tax Liability:</span>
                    <span className="font-bold text-sm text-sky-900 font-mono">
                      {formatCurrency(financialData.taxSummary.netTaxLiability)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sales Ledger */}
          {activeTab === 'sales' && salesReportData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800">
                  Total Sales: {formatCurrency(salesReportData.summary.totalSalesAmount)} (
                  {salesReportData.summary.totalInvoices} Invoices)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesReportData.sales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{s.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{formatDate(s.createdAt)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {s.customer?.name || 'Walk-in'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{s.taxAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                          -₹{s.discountAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(s.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Inventory Valuation */}
          {activeTab === 'inventory' && inventoryValuation && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Inventory Valuation Summary</h3>
                  <div className="flex gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-slate-500">Purchase Value: </span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatCurrency(inventoryValuation.summary.totalPurchaseValuation)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">MRP Value: </span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatCurrency(inventoryValuation.summary.totalMrpValuation)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Potential Margin: </span>
                      <span className="font-bold font-mono text-emerald-700">
                        {formatCurrency(inventoryValuation.summary.potentialProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportInventoryExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export to Excel (.xlsx)
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Purchase Value</th>
                      <th className="py-2.5 px-3 text-right">MRP Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryValuation.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.sku}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-800">
                          {item.stock} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(item.purchaseValue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.mrpValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
