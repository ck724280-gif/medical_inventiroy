'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  FileText,
  Building2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New PO Form
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([
    {
      medicineId: '',
      orderedQty: 10,
      expectedRate: 0,
      taxPercent: 12,
    },
  ]);

  const { data: posData, isLoading } = useQuery({
    queryKey: ['purchase-orders-list', search, selectedBranchId, activeTab],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders', {
        params: {
          branchId: selectedBranchId || undefined,
          search: search || undefined,
          status: activeTab,
        },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-po-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-po-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const purchaseOrders = Array.isArray(posData) ? posData : [];
  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
  const medicines = Array.isArray(medicinesData) ? medicinesData : [];

  const createPoMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/purchase-orders', {
        supplierId,
        branchId: selectedBranchId,
        expectedDeliveryDate: expectedDeliveryDate || null,
        notes,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          orderedQty: Number(item.orderedQty),
          expectedRate: Number(item.expectedRate),
          taxPercent: Number(item.taxPercent || 12),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setShowCreateModal(false);
      alert('Purchase Order created successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create Purchase Order.');
    },
  });

  const convertPoMutation = useMutation({
    mutationFn: async (poId: string) => {
      const res = await apiClient.post(`/purchase-orders/${poId}/convert`);
      return res.data?.data || res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      // Store converted PO payload in sessionStorage and navigate to /purchases
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('medcare_po_convert', JSON.stringify(data));
      }
      router.push('/purchases');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to convert Purchase Order.');
    },
  });

  const deletePoMutation = useMutation({
    mutationFn: async (poId: string) => {
      return apiClient.delete(`/purchase-orders/${poId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      alert('Purchase order deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete purchase order.');
    },
  });

  const handleDeletePo = (po: any) => {
    if (confirm(`Are you sure you want to delete purchase order #${po.poNumber}?`)) {
      deletePoMutation.mutate(po.id);
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: '',
        orderedQty: 10,
        expectedRate: 0,
        taxPercent: 12,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Purchase Orders (PO)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create supplier purchase orders and auto-convert to inward purchase bills with 1 click.
              </p>
            </div>

            <button
              onClick={() => {
                setSupplierId('');
                setExpectedDeliveryDate('');
                setNotes('');
                setItems([{ medicineId: '', orderedQty: 10, expectedRate: 0, taxPercent: 12 }]);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </button>
          </div>

          {/* Status Tabs & Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ACTIVE'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Active / Pending Orders
              </button>
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed / Inwarded Orders
              </button>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ALL'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                All Orders
              </button>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm dark:shadow-xl flex items-center gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by PO # or Supplier..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>
          </div>

          {/* PO Table */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Date Created</th>
                    <th className="py-3 px-4">Supplier Agency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Estimated Amount</th>
                    <th className="py-3 px-4 text-center">Actions / Convert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        {activeTab === 'ACTIVE'
                          ? 'No active/pending purchase orders. All orders have been converted or none created.'
                          : 'No purchase orders found in this view.'}
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po: any) => (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold font-mono text-sky-600 dark:text-sky-400">{po.poNumber}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">{formatDate(po.createdAt)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{po.supplier?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                              po.status === 'FULLY_RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : po.status === 'SENT'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {po.status === 'FULLY_RECEIVED' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            )}
                            {po.status === 'FULLY_RECEIVED' ? 'CONVERTED / RECEIVED' : po.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(po.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {po.status !== 'FULLY_RECEIVED' && po.status !== 'CANCELLED' ? (
                              <button
                                onClick={() => convertPoMutation.mutate(po.id)}
                                disabled={convertPoMutation.isPending}
                                title="Convert to Inward Purchase Bill"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px] inline-flex items-center gap-1.5 shadow transition cursor-pointer active:scale-95"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                Convert to Bill
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-900 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Converted
                              </span>
                            )}
                            <button
                              onClick={() => handleDeletePo(po)}
                              title="Delete Purchase Order"
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Create PO Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Supplier Purchase Order</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier Agency *</label>
                    <select
                      required
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Ph: {s.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PO Notes / Instructions</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Urgent stock replenishment for upcoming seasonal rush"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Order Line Items:</span>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="px-2.5 py-1 bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-sky-200 dark:border-slate-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Medicine</label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => {
                              const med = medicines.find((m: any) => m.id === e.target.value);
                              const updated = [...items];
                              updated[idx].medicineId = e.target.value;
                              if (med) {
                                updated[idx].expectedRate = med.defaultPurchasePrice || med.mrp * 0.7;
                                updated[idx].taxPercent = med.taxPercent || 12;
                              }
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                          >
                            <option value="">Select Medicine...</option>
                            {medicines.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Ordered Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.orderedQty}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].orderedQty = parseInt(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Expected Rate (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.expectedRate}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].expectedRate = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Tax (%)</label>
                          <input
                            type="number"
                            value={item.taxPercent}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].taxPercent = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createPoMutation.isPending}
                    onClick={() => createPoMutation.mutate()}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition"
                  >
                    {createPoMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
