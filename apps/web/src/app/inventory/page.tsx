'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { BatchStatus, AdjustmentReason } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'batches' | 'expiry' | 'reorder' | 'movements'>('batches');
  const [search, setSearch] = useState('');
  const [adjustmentModal, setAdjustmentModal] = useState<any | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>(AdjustmentReason.PHYSICAL_MISMATCH);

  // 1. Batches Query
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['inventory-batches', selectedBranchId, search],
    queryFn: async () => {
      const res = await apiClient.get('/batches', {
        params: { branchId: selectedBranchId || undefined, limit: 50 },
      });
      return res.data;
    },
    enabled: activeTab === 'batches',
  });

  // 2. Expiry Dashboard Query
  const { data: expiryData } = useQuery({
    queryKey: ['inventory-expiry', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/batches/expiry-dashboard', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data;
    },
    enabled: activeTab === 'expiry',
  });

  // 3. Low Stock / Reorder Suggestions Query
  const { data: reorderData } = useQuery({
    queryKey: ['inventory-low-stock', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/low-stock', {
        params: { branchId: selectedBranchId || undefined },
      });
      return res.data;
    },
    enabled: activeTab === 'reorder',
  });

  // 4. Stock Movements Ledger Query
  const { data: movementsData } = useQuery({
    queryKey: ['inventory-movements', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/movements', {
        params: { branchId: selectedBranchId || undefined, limit: 50 },
      });
      return res.data;
    },
    enabled: activeTab === 'movements',
  });

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/adjustments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      setAdjustmentModal(null);
    },
  });

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentModal || !selectedBranchId) return;

    adjustMutation.mutate({
      branchId: selectedBranchId,
      medicineId: adjustmentModal.medicine.id,
      batchId: adjustmentModal.id,
      adjustmentQty: Number(adjustmentQty),
      reason: adjustmentReason,
    });
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
                Batch Inventory & Expiry Control
              </h2>
              <p className="text-xs text-slate-500">
                Track pharmaceutical stock at the individual batch level with strict FEFO dispensation rules.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'batches' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Batches
              </button>
              <button
                onClick={() => setActiveTab('expiry')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'expiry' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expiry Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reorder')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'reorder' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reorder Suggestions
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'movements' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Movement Ledger
              </button>
            </div>
          </div>

          {/* TAB 1: All Batches Table */}
          {activeTab === 'batches' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4">Mfg Date</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4 text-right">Cost (₹)</th>
                      <th className="py-3 px-4 text-right">Selling Rate (₹)</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchesLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          Loading batch inventory...
                        </td>
                      </tr>
                    ) : batchesData?.data?.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{b.medicine?.name}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-sky-800">{b.batchNumber}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(b.mfgDate)}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {formatDate(b.expiryDate, 'MM-YYYY')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">₹{b.purchasePrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{b.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">
                          {b.currentQty}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === BatchStatus.ACTIVE
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setAdjustmentModal(b);
                              setAdjustmentQty(0);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium text-slate-700 transition"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Expiry Dashboard (§26) */}
          {activeTab === 'expiry' && expiryData && (
            <div className="space-y-6">
              {/* Expiry summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-red-700 uppercase">Expired Batches</span>
                  <p className="text-2xl font-black text-red-800 mt-1">
                    {expiryData.summary.expiredCount}
                  </p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Est. Value: {formatCurrency(expiryData.summary.expiredValue)}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-amber-700 uppercase">Expiring in 7 Days</span>
                  <p className="text-2xl font-black text-amber-800 mt-1">
                    {expiryData.summary.expiring7Count}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">High urgency items</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-orange-700 uppercase">Expiring in 30 Days</span>
                  <p className="text-2xl font-black text-orange-800 mt-1">
                    {expiryData.summary.expiring30Count}
                  </p>
                  <p className="text-[11px] text-orange-600 mt-0.5">
                    Est. Value: {formatCurrency(expiryData.summary.expiring30Value)}
                  </p>
                </div>

                <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-sky-700 uppercase">Expiring in 90 Days</span>
                  <p className="text-2xl font-black text-sky-800 mt-1">
                    {expiryData.summary.expiring90Count}
                  </p>
                  <p className="text-[11px] text-sky-600 mt-0.5">Medium range plan</p>
                </div>
              </div>

              {/* Expired Batches Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-red-700 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Expired Stock (Immediate Disposal Required)
                </h3>
                {expiryData.expired.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No expired medicine batches found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Batch</th>
                          <th className="py-2 px-3">Expired On</th>
                          <th className="py-2 px-3 text-center">Quantity</th>
                          <th className="py-2 px-3 text-right">Cost Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expiryData.expired.map((b: any) => (
                          <tr key={b.id}>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{b.medicine?.name}</td>
                            <td className="py-2.5 px-3 font-mono text-red-700">{b.batchNumber}</td>
                            <td className="py-2.5 px-3 font-mono">{formatDate(b.expiryDate)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-red-600">{b.currentQty}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-red-700">
                              ₹{(b.currentQty * b.purchasePrice).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Reorder Suggestions (§27) */}
          {activeTab === 'reorder' && reorderData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-800">
                Automated Stock Reorder Suggestions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Reorder Threshold</th>
                      <th className="py-2.5 px-3 text-center">Suggested Order Qty</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...reorderData.outOfStock, ...reorderData.criticalStock, ...reorderData.lowStock].map(
                      (item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono">
                            {item.currentStock} {item.baseUnit?.abbreviation}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{item.reorderLevel}</td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-sky-700 bg-sky-50/50">
                            +{item.suggestedReorderQty} {item.baseUnit?.abbreviation}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.currentStock === 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Movement Ledger (§28) */}
          {activeTab === 'movements' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-center">Direction</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementsData?.data?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-500">{formatDate(m.createdAt)}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.medicine?.name}</td>
                      <td className="py-2.5 px-4 font-mono">{m.batch?.batchNumber}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-semibold">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        <span className={m.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}>
                          {m.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{m.qty}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {m.user?.firstName} {m.user?.lastName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{m.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Stock Adjustment Modal */}
        {adjustmentModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Adjust Batch Stock</h3>
                <button onClick={() => setAdjustmentModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-xl">
                <p>
                  <span className="font-semibold text-slate-700">Medicine:</span> {adjustmentModal.medicine?.name}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Batch:</span> {adjustmentModal.batchNumber}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Current Stock:</span> {adjustmentModal.currentQty}
                </p>
              </div>

              <form onSubmit={handleApplyAdjustment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Adjustment Quantity (+ to add, - to subtract)
                  </label>
                  <input
                    required
                    type="number"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    placeholder="-5 or +10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    New total will be: {adjustmentModal.currentQty + Number(adjustmentQty)}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason</label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  >
                    {Object.values(AdjustmentReason).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentModal(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustMutation.isPending || adjustmentQty === 0}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow transition disabled:opacity-50"
                  >
                    {adjustMutation.isPending ? 'Saving...' : 'Confirm Adjustment'}
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
