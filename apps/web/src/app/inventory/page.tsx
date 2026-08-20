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
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
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
      return res.data?.data || res.data || {};
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
      return res.data?.data || res.data || {};
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
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: activeTab === 'movements',
  });

  const batches = Array.isArray(batchesData) ? batchesData : [];
  const movements = Array.isArray(movementsData) ? movementsData : [];

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
      medicineId: adjustmentModal.medicine?.id,
      batchId: adjustmentModal.id,
      qty: Number(adjustmentQty),
      reason: adjustmentReason,
      notes: 'Manual physical adjustment',
    });
  };

  const reorderList = [
    ...(Array.isArray(reorderData?.outOfStock) ? reorderData.outOfStock : []),
    ...(Array.isArray(reorderData?.criticalStock) ? reorderData.criticalStock : []),
    ...(Array.isArray(reorderData?.lowStock) ? reorderData.lowStock : []),
  ];

  return (
    <div className="flex h-screen bg-obsidian-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Batch & Inventory Management
              </h2>
              <p className="text-xs text-slate-500">
                FEFO-prioritized batch stock, expiry tracking, reorder points, and stock movements ledger.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            {[
              { id: 'batches', label: 'All Active Batches (FEFO)', icon: Boxes },
              { id: 'expiry', label: 'Expiry Dashboard', icon: Clock },
              { id: 'reorder', label: 'Reorder / Low Stock', icon: AlertTriangle },
              { id: 'movements', label: 'Stock Movements Ledger', icon: ArrowUpDown },
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

          {/* TAB 1: Batches Table */}
          {activeTab === 'batches' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Medicine / SKU</th>
                      <th className="py-3 px-4 font-mono">Batch No</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-right">Purchase Rate</th>
                      <th className="py-3 px-4 text-right">Selling Rate</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchesLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Loading batch stock...
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No active batches found in this branch.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{b.medicine?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{b.medicine?.sku}</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-800">{b.batchNumber}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{formatDate(b.expiryDate)}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                            {b.currentQty} {b.medicine?.baseUnit?.abbreviation}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(b.purchasePrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(b.sellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === BatchStatus.ACTIVE
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === BatchStatus.EXPIRED
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setAdjustmentModal(b)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition"
                            >
                              Adjust Stock
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Expiry Dashboard */}
          {activeTab === 'expiry' && expiryData && (
            <div className="grid grid-cols-3 gap-6">
              {/* Expired */}
              <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Already Expired</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(Array.isArray(expiryData.expired) ? expiryData.expired : []).map((b: any) => (
                    <div key={b.id} className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-xs">
                      <p className="font-bold text-slate-900">{b.medicine?.name}</p>
                      <div className="flex justify-between font-mono text-[10px] text-slate-500 mt-1">
                        <span>B: {b.batchNumber}</span>
                        <span className="text-red-600 font-bold">{b.currentQty} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiring in 30 days */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Expiring in 30 Days</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(Array.isArray(expiryData.expiringIn30Days) ? expiryData.expiringIn30Days : []).map((b: any) => (
                    <div key={b.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs">
                      <p className="font-bold text-slate-900">{b.medicine?.name}</p>
                      <div className="flex justify-between font-mono text-[10px] text-slate-500 mt-1">
                        <span>B: {b.batchNumber}</span>
                        <span className="text-amber-700 font-bold">{b.currentQty} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiring in 90 days */}
              <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">Expiring in 90 Days</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(Array.isArray(expiryData.expiringIn90Days) ? expiryData.expiringIn90Days : []).map((b: any) => (
                    <div key={b.id} className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-xs">
                      <p className="font-bold text-slate-900">{b.medicine?.name}</p>
                      <div className="flex justify-between font-mono text-[10px] text-slate-500 mt-1">
                        <span>B: {b.batchNumber}</span>
                        <span className="text-sky-700 font-bold">{b.currentQty} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Reorder Suggestions */}
          {activeTab === 'reorder' && reorderData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3 text-center">Current Stock</th>
                    <th className="py-2.5 px-3 text-center">Reorder Level</th>
                    <th className="py-2.5 px-3 text-center">Suggested Reorder Qty</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reorderList.map((item: any) => (
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
                            item.currentStock === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Movement Ledger */}
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
                  {movements.map((m: any) => (
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
