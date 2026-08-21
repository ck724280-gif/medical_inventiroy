'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  Plus,
  ArrowDownLeft,
  X,
  Printer,
  MessageCircle,
  Edit,
  Trash2,
  Save,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ReturnCondition, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency, buildWhatsAppUrl } from '@medical-inventory/shared-utils';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [loadedInvoice, setLoadedInvoice] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [createRefundMode, setCreateRefundMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [createNotes, setCreateNotes] = useState('');

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Edit State
  const [editingReturn, setEditingReturn] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    returnNumber: '',
    refundMode: 'CASH',
    refundAmount: 0,
    notes: '',
    createdAt: '',
  });

  const { data: returnsData, isLoading, refetch } = useQuery({
    queryKey: ['sales-returns-list', selectedBranchId, search],
    queryFn: async () => {
      const res = await apiClient.get('/sales-returns', {
        params: {
          branchId: selectedBranchId || undefined,
          search: search || undefined,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const returns = Array.isArray(returnsData) ? returnsData : [];

  // Summary Metrics
  const totalReturnsCount = returns.length;
  const totalRefundAmount = returns.reduce((sum: number, r: any) => sum + Number(r.refundAmount || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReturnsCount = returns.filter((r: any) => r.createdAt && r.createdAt.startsWith(todayStr)).length;

  const handleLookupInvoice = async () => {
    if (!invoiceLookup.trim()) return;
    try {
      const res = await apiClient.get(`/sales/by-invoice/${invoiceLookup.trim()}`);
      const inv = res.data?.data || res.data;
      setLoadedInvoice(inv);
      if (Array.isArray(inv.items)) {
        const invoiceReturns = inv.returns || [];
        setReturnItems(
          inv.items.map((item: any) => {
            const alreadyReturned = invoiceReturns.reduce((sum: number, r: any) => {
              const matching = (r.items || []).find((ri: any) => ri.salesItemId === item.id);
              return sum + (matching?.returnQty || 0);
            }, 0);
            const maxReturnable = Math.max(0, item.qty - alreadyReturned);
            const unitRate = item.qty > 0 ? (Number(item.lineTotal) / item.qty) : item.rate;

            return {
              salesItemId: item.id,
              medicineId: item.medicineId,
              batchId: item.batchId,
              name: item.medicine?.name || item.name,
              batchNumber: item.batch?.batchNumber || 'N/A',
              soldQty: item.qty,
              alreadyReturned,
              maxReturnable,
              returnQty: 0,
              rate: unitRate,
              condition: ReturnCondition.RESALABLE,
              reason: 'Customer returned',
            };
          })
        );
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Invoice not found');
    }
  };

  // Live estimated refund sum
  const estimatedRefundSum = returnItems.reduce((sum, item) => {
    const qty = Math.min(item.maxReturnable || item.soldQty, Math.max(0, Number(item.returnQty || 0)));
    return sum + (qty * Number(item.rate || 0));
  }, 0);

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      const activeReturns = returnItems.filter((i) => i.returnQty > 0);
      if (activeReturns.length === 0) throw new Error('Please select at least 1 item with return quantity > 0');

      return apiClient.post('/sales-returns', {
        salesInvoiceId: loadedInvoice.id,
        branchId: selectedBranchId,
        refundMode: createRefundMode,
        notes: createNotes,
        items: activeReturns.map((i) => ({
          salesItemId: i.salesItemId,
          medicineId: i.medicineId,
          batchId: i.batchId,
          returnQty: Number(i.returnQty),
          condition: i.condition,
          reason: i.reason,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      setShowModal(false);
      setLoadedInvoice(null);
      setReturnItems([]);
      setInvoiceLookup('');
      setCreateNotes('');
      setCreateRefundMode(PaymentMode.CASH);
      refetch();
      alert('Sales return and refund processed successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to process return');
    },
  });

  const handlePrintReturn = async (id: string) => {
    try {
      const res = await apiClient.get(`/sales-returns/${id}/receipt`);
      setActiveReceipt(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to load return receipt.');
    }
  };

  const handleWhatsAppShareReturn = (ret: any) => {
    const phone = ret.customer?.mobile || prompt('Enter customer WhatsApp mobile:');
    if (!phone) return;

    const message = `🏥 *MEDCARE PHARMACY - SALES RETURN & REFUND RECEIPT*
----------------------------------------
📄 *Return #:* ${ret.returnNumber}
🧾 *Original Invoice:* #${ret.salesInvoice?.invoiceNumber || 'N/A'}
📅 *Date:* ${formatDate(ret.createdAt)}
👤 *Customer:* ${ret.customer?.name || 'Walk-in Customer'}
💵 *Refund Amount:* Rs. ${Number(ret.refundAmount || 0).toFixed(2)}
💳 *Refund Mode:* ${ret.refundMode || 'CASH'}
✅ *Status:* ${ret.status}

Your returned medicines have been accepted and refund processed.
Thank you for your visit to MedCare Pharmacy!`;

    const url = buildWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  };

  const startEdit = (ret: any) => {
    setEditingReturn(ret);
    const localDate = new Date(ret.createdAt);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);

    setEditForm({
      returnNumber: ret.returnNumber || '',
      refundMode: ret.refundMode || 'CASH',
      refundAmount: Number(ret.refundAmount || 0),
      notes: ret.notes || '',
      createdAt: localISOTime,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/sales-returns/${editingReturn.id}`, editForm);
      setEditingReturn(null);
      refetch();
      alert('Return record updated successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update return record.');
    }
  };

  const handleDeleteReturn = async (id: string, returnNum: string) => {
    if (
      !confirm(
        `Warning: Are you sure you want to delete/cancel Sales Return ${returnNum}?\n\nThis will reverse the batch stock quantities (deduct returned stock) and adjust customer balance credits. This action is irreversible.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/sales-returns/${id}`);
      refetch();
      alert('Return record deleted and stock reversed successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete return record.');
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Sales Returns &amp; Refunds
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Process customer medicine returns against tax bills, restore inventory, and issue instant refunds or credit notes.
              </p>
            </div>

            <button
              onClick={() => {
                setLoadedInvoice(null);
                setReturnItems([]);
                setInvoiceLookup('');
                setCreateNotes('');
                setCreateRefundMode(PaymentMode.CASH);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Process Sales Return
            </button>
          </div>

          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Returns</p>
                <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {totalReturnsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Refunded</p>
                <p className="text-xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
                  {formatCurrency(totalRefundAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Today&apos;s Returns</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {todayReturnsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-xl flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Return #, Original Invoice #, or Customer Name/Mobile..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* Returns Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Return #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Original Invoice</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Refund Amount</th>
                    <th className="py-3 px-4 text-center">Refund Mode</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading returns...
                      </td>
                    </tr>
                  ) : returns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No sales returns found. Click &quot;Process Sales Return&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    returns.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {r.returnNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                          #{r.salesInvoice?.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                          {r.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(r.refundAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {r.refundMode || 'CASH'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintReturn(r.id)}
                              title="Print Credit Note / Return Receipt"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleWhatsAppShareReturn(r)}
                              title="Share Return Receipt on WhatsApp"
                              className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            {isUserSuperAdmin && (
                              <>
                                <button
                                  onClick={() => startEdit(r)}
                                  title="Super Admin Edit Return"
                                  className="p-1.5 bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReturn(r.id, r.returnNumber)}
                                  title="Delete / Cancel Return &amp; Reverse Stock"
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

        {/* Process Return Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[92vh] text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                  <RotateCcw className="w-5 h-5" />
                  <h3>Process Customer Sales Return</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Invoice Lookup Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Invoice Number (e.g. INV-000125)..."
                  value={invoiceLookup}
                  onChange={(e) => setInvoiceLookup(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupInvoice()}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleLookupInvoice}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow active:scale-95 transition"
                >
                  Lookup Bill
                </button>
              </div>

              {loadedInvoice && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 dark:bg-[#090d16] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Invoice: #{loadedInvoice.invoiceNumber} | Total: ₹{Number(loadedInvoice.totalAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Customer: {loadedInvoice.customer?.name || 'Walk-in'} | Date: {formatDate(loadedInvoice.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Refund</span>
                      <span className="text-base font-black text-red-600 font-mono">
                        ₹{estimatedRefundSum.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Select Items and Quantities to Return:
                    </label>
                    {returnItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-12 sm:col-span-4">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Batch: {item.batchNumber} (Sold: {item.soldQty}, Ret: {item.alreadyReturned})
                          </p>
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                            Ret Qty (Max {item.maxReturnable})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={item.maxReturnable}
                            value={item.returnQty === 0 ? '' : item.returnQty}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                              const bounded = Math.min(item.maxReturnable, Math.max(0, val));
                              const updated = [...returnItems];
                              updated[idx].returnQty = bounded;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-3">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Condition</label>
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].condition = e.target.value;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-900 dark:text-white"
                          >
                            <option value={ReturnCondition.RESALABLE}>Resalable (Restores Stock)</option>
                            <option value={ReturnCondition.DAMAGED}>Damaged (Mark Damaged)</option>
                            <option value={ReturnCondition.EXPIRED}>Expired (Mark Expired)</option>
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-3">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Reason</label>
                          <input
                            type="text"
                            value={item.reason}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].reason = e.target.value;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Refund Mode & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Refund Mode *
                      </label>
                      <select
                        value={createRefundMode}
                        onChange={(e: any) => setCreateRefundMode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value={PaymentMode.CASH}>CASH (Cash returned to customer)</option>
                        <option value={PaymentMode.UPI}>UPI / Instant Refund</option>
                        <option value={PaymentMode.CARD}>CARD / POS Refund</option>
                        <option value={PaymentMode.CREDIT}>CREDIT NOTE (Adjust Ledger Balance)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Return Notes / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Wrong dosage purchased by customer"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => createReturnMutation.mutate()}
                      disabled={createReturnMutation.isPending || estimatedRefundSum <= 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow active:scale-95 transition"
                    >
                      {createReturnMutation.isPending
                        ? 'Processing Return...'
                        : `Confirm Return & Refund (₹${estimatedRefundSum.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thermal Return Receipt Preview Modal */}
        {activeReceipt && (
          <ThermalReceiptPreview data={activeReceipt} onClose={() => setActiveReceipt(null)} />
        )}

        {/* Super Admin Edit Return Modal */}
        {editingReturn && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] max-w-md w-full p-6 space-y-4 shadow-2xl text-xs text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Edit className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Super Admin Edit Return #{editingReturn.returnNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingReturn(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Return #
                  </label>
                  <input
                    type="text"
                    value={editForm.returnNumber}
                    onChange={(e) => setEditForm({ ...editForm, returnNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Return Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.createdAt}
                    onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Refund Mode
                    </label>
                    <select
                      value={editForm.refundMode}
                      onChange={(e) => setEditForm({ ...editForm, refundMode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">CARD</option>
                      <option value="CREDIT">CREDIT NOTE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Refund Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.refundAmount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, refundAmount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Remarks / Reason
                  </label>
                  <textarea
                    placeholder="Add return audit remarks..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingReturn(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg flex items-center gap-1.5 transition active:scale-95"
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

