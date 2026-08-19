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
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
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

  // Financial Summary Query
  const { data: financialData } = useQuery({
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
  const { data: salesReportData } = useQuery({
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
  const { data: inventoryValuation } = useQuery({
    queryKey: ['inventory-valuation', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/reports/inventory-valuation', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'inventory',
  });

  // GSTR-1 Query (R5)
  const { data: gstr1Data } = useQuery({
    queryKey: ['gstr1-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/gstr1', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'gstr1',
  });

  // GSTR-3B Query (R5)
  const { data: gstr3bData } = useQuery({
    queryKey: ['gstr3b-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/gstr3b', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'gstr3b',
  });

  // HSN Summary Query (R5)
  const { data: hsnData } = useQuery({
    queryKey: ['hsn-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/hsn-summary', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'hsn',
  });

  // Schedule H Register Query (R7)
  const { data: scheduleHData } = useQuery({
    queryKey: ['schedule-h-report', selectedBranchId, dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/schedule-h-register', {
        params: { branchId: selectedBranchId || undefined, ...dateRange },
      });
      return res.data?.data || res.data;
    },
    enabled: activeTab === 'schedule-h',
  });

  const handleExportExcel = (type: string) => {
    const query = new URLSearchParams({
      branchId: selectedBranchId || '',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }).toString();
    window.open(`${apiClient.defaults.baseURL}/reports/${type}/excel?${query}`, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header & Date Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Legal Analytics</h2>
              <p className="text-xs text-slate-500">
                GST Returns (GSTR-1, GSTR-3B), HSN Summaries, and Schedule H / H1 Drug Registers.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-slate-200 gap-2">
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
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
                    isActive
                      ? 'bg-white text-sky-600 border-sky-600 shadow-sm'
                      : 'text-slate-500 border-transparent hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB: Financials */}
          {activeTab === 'financials' && financialData && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Gross Revenue</span>
                  <h3 className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatCurrency(financialData.totalRevenue)}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Cost of Goods Sold (COGS)</span>
                  <h3 className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatCurrency(financialData.cogs)}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Gross Profit</span>
                  <h3 className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {formatCurrency(financialData.grossProfit)}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Net Profit Estimate</span>
                  <h3 className="text-xl font-bold font-mono text-sky-700 mt-1">
                    {formatCurrency(financialData.netProfitEstimate)}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Sales */}
          {activeTab === 'sales' && salesReportData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(salesReportData.sales) ? salesReportData.sales : []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{s.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{formatDate(s.createdAt)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{s.customer?.name || 'Walk-in'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{Number(s.taxAmount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(s.totalAmount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: GSTR-1 (R5) */}
          {activeTab === 'gstr1' && gstr1Data && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">GSTR-1 Outward Supplies Summary</h3>
                  <div className="flex gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-slate-500">B2B Sales: </span>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(gstr1Data.summary?.b2bTotal || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">B2C Retail: </span>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(gstr1Data.summary?.b2cTotal || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Tax Liability: </span>
                      <span className="font-bold font-mono text-sky-700">{formatCurrency(gstr1Data.summary?.totalTax || 0)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleExportExcel('gstr1')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Download GSTR-1 Excel (.xlsx)
                </button>
              </div>

              {/* B2B Invoices Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
                <h4 className="font-bold text-xs text-slate-700 mb-3">B2B Invoices (With Customer GSTIN)</h4>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">GSTIN</th>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(gstr1Data.b2b) ? gstr1Data.b2b : []).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-sky-800 font-bold">{row.gstin}</td>
                        <td className="py-2 px-3">{row.customerName}</td>
                        <td className="py-2 px-3 font-mono">{row.invoiceNumber}</td>
                        <td className="py-2 px-3 font-mono">{formatDate(row.date)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.taxableValue)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.igst)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.cgst)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.sgst)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: GSTR-3B (R5) */}
          {activeTab === 'gstr3b' && gstr3bData && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">GSTR-3B Monthly Return Summary</h3>
                  <p className="text-xs text-slate-500">Output tax on outward supplies vs Input Tax Credit (ITC) on inward purchases.</p>
                </div>
                <button
                  onClick={() => handleExportExcel('gstr3b')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Download GSTR-3B Excel (.xlsx)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-xs text-slate-700">3.1 Outward Taxable Supplies (Sales)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Total Taxable Value:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.outwardSupplies?.taxableValue || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>CGST:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.outwardSupplies?.cgst || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>SGST:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.outwardSupplies?.sgst || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-xs text-slate-700">4. Eligible Input Tax Credit (Purchases)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>ITC Taxable Value:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.eligibleItc?.taxableValue || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>ITC CGST:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.eligibleItc?.cgst || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>ITC SGST:</span>
                      <span className="font-mono font-bold">{formatCurrency(gstr3bData.eligibleItc?.sgst || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HSN Summary (R5) */}
          {activeTab === 'hsn' && hsnData && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">HSN Code-wise Outward Tax Summary</h3>
                  <p className="text-xs text-slate-500">Summary of medicine sales categorized by HSN codes and GST slab rates.</p>
                </div>
                <button
                  onClick={() => handleExportExcel('hsn-summary')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Download HSN Summary Excel (.xlsx)
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">UQC / Qty</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-center">Tax Rate</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(hsnData.hsnSummary) ? hsnData.hsnSummary : []).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{row.hsnCode}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.description}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{row.totalQuantity} {row.uqc}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(row.taxableValue)}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{row.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(row.cgst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(row.sgst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Schedule H / H1 Register (R7) */}
          {activeTab === 'schedule-h' && scheduleHData && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Schedule H / H1 / X Controlled Drug Inspection Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statutory medical register with Doctor Details, Patient Info, Batch & Expiry records for drug inspectors.
                  </p>
                </div>
                <button
                  onClick={() => handleExportExcel('schedule-h')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Export Drug Register (.xlsx)
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Patient Name & Age</th>
                      <th className="py-2.5 px-3">Doctor Name & Reg #</th>
                      <th className="py-2.5 px-3">Drug Name</th>
                      <th className="py-2.5 px-3">Schedule</th>
                      <th className="py-2.5 px-3">Batch & Exp</th>
                      <th className="py-2.5 px-3 text-center">Qty Dispensed</th>
                      <th className="py-2.5 px-3 font-mono">Invoice #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(scheduleHData.records) ? scheduleHData.records : []).map((rec: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(rec.dispensedDate)}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{rec.patientName}</span>
                          <span className="text-[10px] text-slate-500">Age: {rec.patientAge} yrs</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 block">{rec.doctorName}</span>
                          <span className="text-[10px] font-mono text-sky-700">Reg: {rec.doctorRegNo}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{rec.drugName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">
                            {rec.drugSchedule}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">
                          B:{rec.batchNumber} | Exp:{rec.expiryDate}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                          {rec.quantityDispensed}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{rec.invoiceNumber}</td>
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
