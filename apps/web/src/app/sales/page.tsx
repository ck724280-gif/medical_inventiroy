'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  Search,
  Printer,
  FileDown,
  MessageCircle,
  Edit,
  Trash2,
  X,
  Save,
  Calendar,
  CreditCard,
  User,
  FileText,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatDate, formatCurrency, generateWhatsAppInvoiceUrl } from '@medical-inventory/shared-utils';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';

export default function SalesPage() {
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Edit State
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    customerId: '',
    paymentStatus: 'PAID',
    paymentMode: 'CASH',
    createdAt: '',
    notes: '',
  });

  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-list', selectedBranchId, search],
    queryFn: async () => {
      const res = await apiClient.get('/sales', {
        params: {
          branchId: selectedBranchId || undefined,
          search: search || undefined,
          limit: 50,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.sales || []);
    },
  });

  // Fetch customers for assignment in edit modal
  const { data: customersData } = useQuery({
    queryKey: ['customers-list-all'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.customers || []);
    },
  });

  const sales = Array.isArray(salesData) ? salesData : [];
  const customers = Array.isArray(customersData) ? customersData : [];

  const handlePrintThermal = async (id: string) => {
    try {
      const res = await apiClient.get(`/sales/${id}/receipt`);
      setActiveReceipt(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to load receipt.');
    }
  };

  const handleDownloadPdf = (id: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'https://medical-inventiroy.onrender.com'}/sales/${id}/pdf`, '_blank');
  };

  const handleWhatsAppShare = (sale: any) => {
    const phone = sale.customer?.mobile || prompt('Enter customer WhatsApp mobile:');
    if (!phone) return;
    const url = generateWhatsAppInvoiceUrl(phone, sale.invoiceNumber, sale.totalAmount);
    window.open(url, '_blank');
  };

  const startEdit = (sale: any) => {
    setEditingInvoice(sale);
    // Format timestamp for datetime-local input (yyyy-MM-ddThh:mm)
    const localDate = new Date(sale.createdAt);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);

    setEditForm({
      customerId: sale.customerId || '',
      paymentStatus: sale.paymentStatus || 'PAID',
      paymentMode: sale.payments?.[0]?.paymentMode || 'CASH',
      createdAt: localISOTime,
      notes: sale.notes || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/sales/${editingInvoice.id}`, editForm);
      setEditingInvoice(null);
      refetch();
      alert('Invoice details updated successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update invoice details.');
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNum: string) => {
    if (!confirm(`Warning: Are you sure you want to delete invoice ${invoiceNum}?\n\nThis will restore the inventory stock of all medicines in this invoice and reverse customer credit balances. This action is irreversible.`)) {
      return;
    }
    try {
      await apiClient.delete(`/sales/${id}`);
      refetch();
      alert('Invoice deleted successfully and stock restored.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  const isUserSuperAdmin = isSuperAdmin();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Sales Invoices &amp; Billing History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                View customer tax bills, reprint thermal receipts, share bills on WhatsApp, and export PDF records.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-xl flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Invoice Number, Customer Name or Mobile..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading sales invoices...
                      </td>
                    </tr>
                  ) : sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No sales invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{sale.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">{formatDate(sale.createdAt)}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          {sale.customer?.mobile && (
                            <p className="text-[10px] text-slate-400 font-mono">{sale.customer.mobile}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">{sale._count?.items || 0}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          ₹{Number(sale.taxAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(sale.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}>
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleWhatsAppShare(sale)}
                              title="Share on WhatsApp"
                              className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintThermal(sale.id)}
                              title="Print Thermal Receipt"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(sale.id)}
                              title="Download Tax PDF"
                              className="p-1.5 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                            {isUserSuperAdmin && (
                              <>
                                <button
                                  onClick={() => startEdit(sale)}
                                  title="Edit Invoice"
                                  className="p-1.5 bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(sale.id, sale.invoiceNumber)}
                                  title="Delete Invoice"
                                  className="p-1.5 bg-red-50 dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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

        {/* Edit Invoice Modal */}
        {editingInvoice && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Edit className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Edit Invoice {editingInvoice.invoiceNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Invoice Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.createdAt}
                    onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono transition"
                  />
                </div>

                {/* Customer Assignment */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Assign Customer
                  </label>
                  <select
                    value={editForm.customerId}
                    onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                  >
                    <option value="">Walk-in Customer (General)</option>
                    {customers.map((cust: any) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} ({cust.mobile || 'No Mobile'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status and Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Status
                    </label>
                    <select
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                    >
                      <option value="PAID">PAID</option>
                      <option value="UNPAID">UNPAID</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Payment Method
                    </label>
                    <select
                      value={editForm.paymentMode}
                      onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                    </select>
                  </div>
                </div>

                {/* Notes/Remarks */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Internal Notes / Remarks
                  </label>
                  <textarea
                    placeholder="Add billing comments or audit reasons..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                {/* Confirm actions */}
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg flex items-center gap-1.5 transition"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
