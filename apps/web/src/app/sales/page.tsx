'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  Search,
  Printer,
  FileDown,
  Eye,
  X,
  CreditCard,
  MessageCircle,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ThermalReceiptDataDto, PaperWidth } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency, generateWhatsAppInvoiceUrl } from '@medical-inventory/shared-utils';

export default function SalesPage() {
  const { selectedBranchId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<ThermalReceiptDataDto | null>(null);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', selectedBranchId, search],
    queryFn: async () => {
      const res = await apiClient.get('/sales', {
        params: { branchId: selectedBranchId || undefined, search: search || undefined, limit: 50 },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const sales = Array.isArray(salesData) ? salesData : [];

  const handlePrintThermal = async (invoiceId: string) => {
    try {
      const res = await apiClient.get(`/sales/${invoiceId}/receipt`, {
        params: { paperWidth: PaperWidth.WIDTH_58MM },
      });
      setActiveReceipt(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to load receipt details');
    }
  };

  const handleDownloadPdf = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
  };

  const handleWhatsAppShare = (sale: any) => {
    const mobile = sale.customer?.mobile || prompt('Enter customer WhatsApp mobile number (10 digits):');
    if (!mobile) return;
    const url = generateWhatsAppInvoiceUrl(mobile, sale.invoiceNumber, sale.totalAmount);
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-screen bg-obsidian-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales Invoices & Billing History</h2>
              <p className="text-xs text-slate-500">
                View customer tax bills, reprint thermal receipts, share bills on WhatsApp, and export PDF records.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Invoice Number, Customer Name or Mobile..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading sales invoices...
                      </td>
                    </tr>
                  ) : sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No sales invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-sky-800">{sale.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(sale.createdAt)}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          {sale.customer?.mobile && (
                            <p className="text-[10px] text-slate-400 font-mono">{sale.customer.mobile}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{sale._count?.items || 0}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{Number(sale.taxAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(sale.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleWhatsAppShare(sale)}
                              title="Share on WhatsApp"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintThermal(sale.id)}
                              title="Print Thermal Receipt"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(sale.id)}
                              title="Download Tax PDF"
                              className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Thermal Receipt Preview & Print Modal */}
        {activeReceipt && (
          <ThermalReceiptPreview
            data={activeReceipt}
            onClose={() => setActiveReceipt(null)}
          />
        )}
      </div>
    </div>
  );
}
