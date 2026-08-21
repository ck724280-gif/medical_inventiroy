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
  Plus,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatDate, formatCurrency, buildWhatsAppUrl } from '@medical-inventory/shared-utils';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';

export default function SalesPage() {
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // WhatsApp Share Modal
  const [whatsAppModal, setWhatsAppModal] = useState<any | null>(null);
  const [targetPhone, setTargetPhone] = useState('');

  // Super Admin Edit State
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    customerId: '',
    patientName: '',
    doctorName: '',
    paymentStatus: 'PAID',
    paymentMode: 'CASH',
    paidAmount: 0,
    createdAt: '',
    notes: '',
    items: [] as any[],
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

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-all'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      return Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.customers || []);
    },
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-list-all'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const sales = Array.isArray(salesData) ? salesData : [];
  const customers = Array.isArray(customersData) ? customersData : [];
  const medicines = Array.isArray(medicinesData) ? medicinesData : [];

  const handlePrintThermal = async (id: string) => {
    try {
      const res = await apiClient.get(`/sales/${id}/receipt`);
      setActiveReceipt(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to load receipt.');
    }
  };

  const handleDownloadPdf = (id: string) => {
    window.open(`/receipt/${id}?print=true`, '_blank');
  };

  const triggerWhatsAppRedirect = (sale: any, phone: string) => {
    if (!phone || !phone.trim()) {
      alert('Please enter a valid mobile number.');
      return;
    }

    const grandTotal = Number(sale.totalAmount || 0);
    const paidAmount = (sale.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, grandTotal - paidAmount);
    const receiptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/receipt/${sale.id}`;

    let message = '';
    if (balanceDue > 0) {
      message = `🏥 *MEDCARE PHARMACY - PAYMENT REMINDER & INVOICE*
----------------------------------------
📄 *Invoice:* #${sale.invoiceNumber}
📅 *Date:* ${formatDate(sale.createdAt)}
👤 *Customer:* ${sale.customer?.name || 'Valued Customer'}
💵 *Total Bill:* Rs. ${grandTotal.toFixed(2)}
✅ *Paid Amount:* Rs. ${paidAmount.toFixed(2)}
⚠️ *Pending Balance Due:* Rs. ${balanceDue.toFixed(2)}

Please pay the remaining balance of *Rs. ${balanceDue.toFixed(2)}* via UPI / Cash at your earliest convenience.

📥 *View & Download Digital Tax Receipt:*
${receiptUrl}

Thank you! Get Well Soon.`;
    } else {
      message = `🏥 *MEDCARE PHARMACY - TAX INVOICE*
----------------------------------------
📄 *Invoice:* #${sale.invoiceNumber}
📅 *Date:* ${formatDate(sale.createdAt)}
👤 *Customer:* ${sale.customer?.name || 'Valued Customer'}
💵 *Total Amount:* Rs. ${grandTotal.toFixed(2)}
✅ *Payment Status:* PAID IN FULL

📥 *View & Download Digital Tax Receipt:*
${receiptUrl}

Thank you for choosing MedCare Pharmacy! Get Well Soon.`;
    }

    const waUrl = buildWhatsAppUrl(phone.trim(), message);
    window.open(waUrl, '_blank');
    setWhatsAppModal(null);
  };

  const handleWhatsAppShare = (sale: any) => {
    const phone = sale.customer?.mobile || sale.customerMobile;
    if (phone) {
      triggerWhatsAppRedirect(sale, phone);
    } else {
      setTargetPhone('');
      setWhatsAppModal(sale);
    }
  };

  const startEdit = (sale: any) => {
    setEditingInvoice(sale);
    const localDate = new Date(sale.createdAt);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);

    const paid = (sale.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    setEditForm({
      invoiceNumber: sale.invoiceNumber || '',
      customerId: sale.customerId || '',
      patientName: sale.prescriptionRecord?.patientName || '',
      doctorName: sale.prescriptionRecord?.doctorName || '',
      paymentStatus: sale.paymentStatus || 'PAID',
      paymentMode: sale.payments?.[0]?.paymentMode || 'CASH',
      paidAmount: paid,
      createdAt: localISOTime,
      notes: sale.notes || '',
      items: (sale.items || []).map((item: any) => ({
        id: item.id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        medicineName: item.medicine?.name || 'Medicine',
        batchNumber: item.batch?.batchNumber || 'BT-001',
        qty: item.qty,
        rate: item.rate,
        mrp: item.mrp || item.rate,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent || 0,
        lineTotal: item.lineTotal,
      })),
    });
  };

  const handleEditItemChange = (idx: number, field: string, val: any) => {
    const updated = [...editForm.items];
    updated[idx] = { ...updated[idx], [field]: val };

    const qty = Number(updated[idx].qty || 1);
    const rate = Number(updated[idx].rate || 0);
    const disc = Number(updated[idx].discountPercent || 0);
    const tax = Number(updated[idx].taxPercent || 0);

    const itemSubtotal = qty * rate;
    const discVal = (itemSubtotal * disc) / 100;
    const taxable = itemSubtotal - discVal;
    const itemTax = (taxable * tax) / 100;
    updated[idx].lineTotal = taxable + itemTax;

    setEditForm({ ...editForm, items: updated });
  };

  const removeEditItemRow = (idx: number) => {
    if (editForm.items.length <= 1) {
      alert('Invoice must contain at least 1 item.');
      return;
    }
    setEditForm({
      ...editForm,
      items: editForm.items.filter((_, i) => i !== idx),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/sales/${editingInvoice.id}`, editForm);
      setEditingInvoice(null);
      refetch();
      alert('Sales Invoice updated successfully by Super Admin.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update invoice.');
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNum: string) => {
    if (
      !confirm(
        `Warning: Are you sure you want to delete invoice ${invoiceNum}?\n\nThis will restore the inventory stock of all medicines in this invoice and reverse customer credit balances. This action is irreversible.`
      )
    ) {
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sales Invoices &amp; Billing History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                View customer tax bills, send WhatsApp receipts with secure links, reprint thermal receipts, and export PDF records.
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
              <table className="w-full text-left border-collapse text-xs min-w-[750px]">
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
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          {sale.customer?.mobile && (
                            <p className="text-[10px] text-slate-400 font-mono">{sale.customer.mobile}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                          {sale._count?.items || sale.items?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          ₹{Number(sale.taxAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(sale.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              sale.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleWhatsAppShare(sale)}
                              title="Send WhatsApp Invoice &amp; Link"
                              className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintThermal(sale.id)}
                              title="Print Thermal POS Receipt"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(sale.id)}
                              title="View / Download Printable Tax Invoice PDF"
                              className="p-1.5 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                            {isUserSuperAdmin && (
                              <>
                                <button
                                  onClick={() => startEdit(sale)}
                                  title="Super Admin Edit Invoice"
                                  className="p-1.5 bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(sale.id, sale.invoiceNumber)}
                                  title="Delete Invoice &amp; Restore Stock"
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

        {/* WhatsApp Mobile Prompt Modal */}
        {whatsAppModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Send WhatsApp Receipt</h3>
                </div>
                <button
                  onClick={() => setWhatsAppModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300">
                  Enter the customer&apos;s 10-digit WhatsApp number to send invoice <strong>#{whatsAppModal.invoiceNumber}</strong>:
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    WhatsApp Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    autoFocus
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsAppModal(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerWhatsAppRedirect(whatsAppModal, targetPhone)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thermal Receipt Preview & Print Modal */}
        {activeReceipt && (
          <ThermalReceiptPreview data={activeReceipt} onClose={() => setActiveReceipt(null)} />
        )}

        {/* Super Admin Comprehensive Edit Invoice Modal */}
        {editingInvoice && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] max-w-3xl w-full p-6 space-y-4 shadow-2xl text-xs overflow-y-auto max-h-[92vh] text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Edit className="w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Super Admin Edit Invoice #{editingInvoice.invoiceNumber}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Full override for invoice number, items, pricing, date, and payment ledger.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Top Row: Invoice #, Date, Customer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Invoice #
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.invoiceNumber}
                      onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.createdAt}
                      onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Customer
                    </label>
                    <select
                      value={editForm.customerId}
                      onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Walk-in Customer (General)</option>
                      {customers.map((cust: any) => (
                        <option key={cust.id} value={cust.id}>
                          {cust.name} ({cust.mobile || 'No Mobile'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Patient & Doctor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Kumar"
                      value={editForm.patientName}
                      onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Doctor Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. A. K. Verma"
                      value={editForm.doctorName}
                      onChange={(e) => setEditForm({ ...editForm, doctorName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Invoice Items:</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editForm.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                      >
                        <div className="col-span-12 sm:col-span-4">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Medicine Name</label>
                          <input
                            type="text"
                            disabled
                            value={`${item.medicineName} (${item.batchNumber})`}
                            className="w-full px-2 py-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 text-xs"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleEditItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Rate (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleEditItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-right text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Disc %</label>
                          <input
                            type="number"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleEditItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2 text-right">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Line Total</label>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ₹{Number(item.lineTotal || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeEditItemRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payments & Financial Adjustment */}
                <div className="p-3 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    Payment &amp; Ledger Adjustment
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Paid Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.paidAmount}
                        onChange={(e) =>
                          setEditForm({ ...editForm, paidAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={editForm.paymentMode}
                        onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">CARD</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="CHEQUE">CHEQUE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={editForm.paymentStatus}
                        onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      >
                        <option value="PAID">PAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="UNPAID">UNPAID</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes/Remarks */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Notes / Audit Reason
                  </label>
                  <textarea
                    placeholder="Reason for Super Admin modification..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Save className="w-4 h-4" /> Save Super Admin Changes
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

