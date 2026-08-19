'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  Plus,
  ArrowDownLeft,
  X,
  FileSpreadsheet,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ReturnCondition, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [loadedInvoice, setLoadedInvoice] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['sales-returns-list', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/sales-returns', {
        params: { branchId: selectedBranchId || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const returns = Array.isArray(returnsData) ? returnsData : [];

  const handleLookupInvoice = async () => {
    if (!invoiceLookup.trim()) return;
    try {
      const res = await apiClient.get(`/sales/by-invoice/${invoiceLookup.trim()}`);
      const inv = res.data?.data || res.data;
      setLoadedInvoice(inv);
      if (Array.isArray(inv.items)) {
        setReturnItems(
          inv.items.map((item: any) => ({
            salesItemId: item.id,
            medicineId: item.medicineId,
            batchId: item.batchId,
            name: item.medicine?.name || item.name,
            batchNumber: item.batch?.batchNumber || 'N/A',
            soldQty: item.qty,
            returnQty: 0,
            rate: item.rate,
            condition: ReturnCondition.RESALABLE,
            reason: 'Customer returned',
          }))
        );
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Invoice not found');
    }
  };

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      const activeReturns = returnItems.filter((i) => i.returnQty > 0);
      if (activeReturns.length === 0) throw new Error('No items selected for return');

      return apiClient.post('/sales-returns', {
        salesInvoiceId: loadedInvoice.id,
        branchId: selectedBranchId,
        refundMode: PaymentMode.CASH,
        items: activeReturns.map((i) => ({
          salesItemId: i.salesItemId,
          qty: i.returnQty,
          condition: i.condition,
          reason: i.reason,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      setShowModal(false);
      setLoadedInvoice(null);
      setReturnItems([]);
      setInvoiceLookup('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to process return');
    },
  });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales Returns & Refunds</h2>
              <p className="text-xs text-slate-500">
                Process customer returns against original tax invoices and restore resalable inventory.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Process Sales Return
            </button>
          </div>

          {/* Returns Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Return #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Original Invoice</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Refund Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading returns...
                      </td>
                    </tr>
                  ) : returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No returns processed yet.
                      </td>
                    </tr>
                  ) : (
                    returns.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-sky-800">{r.returnNumber}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(r.createdAt)}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{r.salesInvoice?.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{r.customer?.name || 'Walk-in Customer'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(r.refundAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.status}
                          </span>
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
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Process Sales Return</h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
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
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleLookupInvoice}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow"
                >
                  Lookup Bill
                </button>
              </div>

              {loadedInvoice && (
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800">
                      Invoice: {loadedInvoice.invoiceNumber} | Total: ₹{Number(loadedInvoice.totalAmount || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Customer: {loadedInvoice.customer?.name || 'Walk-in'} | Date: {formatDate(loadedInvoice.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 block">Select Items to Return:</label>
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">Batch: {item.batchNumber} (Sold: {item.soldQty})</p>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block">Return Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={item.soldQty}
                            value={item.returnQty}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].returnQty = parseInt(e.target.value) || 0;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-center font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-slate-400 block">Condition</label>
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].condition = e.target.value;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                          >
                            <option value={ReturnCondition.RESALABLE}>Resalable</option>
                            <option value={ReturnCondition.DAMAGED}>Damaged</option>
                            <option value={ReturnCondition.EXPIRED}>Expired</option>
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-slate-400 block">Reason</label>
                          <input
                            type="text"
                            value={item.reason}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].reason = e.target.value;
                              setReturnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => createReturnMutation.mutate()}
                      disabled={createReturnMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow"
                    >
                      {createReturnMutation.isPending ? 'Processing...' : 'Confirm Return & Refund'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
