'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  X,
  Trash2,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { PurchaseStatus, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);

  // New Purchase Form
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<any[]>([
    {
      medicineId: '',
      batchNumber: '',
      mfgDate: '2025-01-01',
      expiryDate: '2027-12-31',
      qty: 100,
      purchasePrice: 10,
      mrp: 20,
      sellingPrice: 18,
      taxPercent: 12,
    },
  ]);

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/purchases', {
        params: { branchId: selectedBranchId || undefined, limit: 50 },
      });
      return res.data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      return res.data || [];
    },
  });

  const { data: medicines } = useQuery({
    queryKey: ['all-medicines'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return res.data?.data || [];
    },
  });

  // Create Purchase Mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (isDraft?: boolean) => {
      return apiClient.post(
        '/purchases',
        {
          supplierId,
          branchId: selectedBranchId,
          invoiceNumber,
          items: items.map((i) => ({
            ...i,
            qty: Number(i.qty),
            purchasePrice: Number(i.purchasePrice),
            mrp: Number(i.mrp),
            sellingPrice: Number(i.sellingPrice),
            taxPercent: Number(i.taxPercent),
          })),
        },
        { params: { draft: isDraft ? 'true' : 'false' } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      setShowCreateModal(false);
      setInvoiceNumber('');
    },
  });

  // Confirm Purchase Mutation
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/purchases/${id}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
    },
  });

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/purchases/${paymentModal.id}/payments`, {
        amount: Number(paymentAmount),
        paymentMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setPaymentModal(null);
    },
  });

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: medicines?.[0]?.id || '',
        batchNumber: '',
        mfgDate: '2025-01-01',
        expiryDate: '2027-12-31',
        qty: 50,
        purchasePrice: 10,
        mrp: 20,
        sellingPrice: 18,
        taxPercent: 12,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Purchases & Stock Receiving
              </h2>
              <p className="text-xs text-slate-500">
                Log supplier invoices, verify batch numbers and manufacturing dates, and receive stock.
              </p>
            </div>

            <button
              onClick={() => {
                setInvoiceNumber(`PINV-${Date.now().toString(36).toUpperCase()}`);
                setSupplierId(suppliers?.[0]?.id || '');
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Purchase Invoice
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading purchase invoices...
                      </td>
                    </tr>
                  ) : purchasesData?.data?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-sky-800">{p.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.supplier?.name}</td>
                      <td className="py-3 px-4 text-center font-mono">{p._count?.items || 0}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === PurchaseStatus.CONFIRMED
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        {p.status === PurchaseStatus.DRAFT && (
                          <button
                            onClick={() => confirmMutation.mutate(p.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          >
                            Receive & Post
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPaymentModal(p);
                            setPaymentAmount(p.totalAmount);
                          }}
                          className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded text-[11px] font-semibold"
                        >
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Stock Receiving / Purchase Entry Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-slate-800">
                  Receive Inward Stock / Purchase Entry
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    >
                      {suppliers?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Supplier Invoice / Bill No *
                    </label>
                    <input
                      required
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Items Table in Modal */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-bold text-slate-800">Inward Batches & Medicines</label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-xs text-sky-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <label className="text-[10px] text-slate-500 block">Medicine</label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].medicineId = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="">Select Medicine</option>
                            {medicines?.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Batch #</label>
                          <input
                            type="text"
                            placeholder="e.g. B2026-A"
                            value={item.batchNumber}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].batchNumber = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Expiry (YYYY-MM)</label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].expiryDate = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].qty = parseInt(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-center"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">Cost (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.purchasePrice}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].purchasePrice = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-right"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">Selling (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.sellingPrice}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].sellingPrice = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-right"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">MRP (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.mrp}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].mrp = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-right"
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseMutation.mutate(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseMutation.mutate(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow"
                  >
                    Confirm & Update Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Payment Modal */}
        {paymentModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Record Supplier Payment</h3>
                <button onClick={() => setPaymentModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMode.UPI}>UPI</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
