'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { BatchStatus, AdjustmentReason } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const canManage = isSuperAdmin();

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
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to adjust stock.');
    },
  });

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('Only Super Admin can adjust stock levels.');
      return;
    }
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
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Batch &amp; Inventory Management
                </h2>
                {canManage ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Admin Access
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                FEFO-prioritized batch stock, expiry tracking, reorder points, and stock movements ledger.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
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
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-[#0f172a] text-sky-600 dark:text-sky-400 border-sky-600 dark:border-sky-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
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
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {batchesLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          Loading batch stock...
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          No active batches found in this branch.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{b.medicine?.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{b.medicine?.sku}</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{b.batchNumber}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {formatDate(b.expiryDate, 'dd-MM-yyyy')}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-white">
                            {b.currentQty} {b.medicine?.baseUnit?.abbreviation || 'PCS'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(b.purchaseRate || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(b.sellingPrice || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === BatchStatus.ACTIVE
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canManage ? (
                              <button
                                onClick={() => {
                                  setAdjustmentModal(b);
                                  setAdjustmentQty(b.currentQty);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                Adjust Stock
                              </button>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600 p-1" title="Super Admin restricted">
                                <Lock className="w-3.5 h-3.5 opacity-50 mx-auto" />
                              </span>
                            )}
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
          {activeTab === 'expiry' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Already Expired</p>
                      <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {expiryData?.summary?.expiredCount ?? expiryData?.expiredCount ?? expiryData?.expired?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Expiring in 30 Days</p>
                      <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {expiryData?.summary?.expiring30Count ?? expiryData?.expiring30DaysCount ?? expiryData?.expiring30?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Expiring in 90 Days</p>
                      <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                        {expiryData?.summary?.expiring90Count ?? expiryData?.expiring90DaysCount ?? expiryData?.expiring90?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expired / Near Expiry Batches Action Table */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Expired &amp; Near-Expiry Batches List</span>
                  <span className="text-[11px] text-slate-500 font-normal">Action items for quarantine or return</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                    <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-4">Medicine</th>
                        <th className="py-3 px-4 font-mono">Batch No</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4 text-center">Current Stock</th>
                        <th className="py-3 px-4 text-right">Value (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(!expiryData?.expired || expiryData.expired.length === 0) &&
                      (!expiryData?.expiring30 || expiryData.expiring30.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            No expired or near-expiry batches in inventory.
                          </td>
                        </tr>
                      ) : (
                        [...(expiryData?.expired || []), ...(expiryData?.expiring30 || [])].map((b: any) => {
                          const isExp = new Date(b.expiryDate) < new Date();
                          return (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.medicine?.name}</td>
                              <td className="py-3 px-4 font-mono text-sky-600 dark:text-sky-400">{b.batchNumber}</td>
                              <td className="py-3 px-4 font-mono">{formatDate(b.expiryDate)}</td>
                              <td className="py-3 px-4 text-center font-mono font-bold">{b.currentQty}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrency(b.currentQty * b.purchasePrice)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isExp
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  {isExp ? 'EXPIRED' : 'EXPIRING SOON'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {canManage && (
                                  <button
                                    onClick={() => {
                                      setAdjustmentModal(b);
                                      setAdjustmentQty(b.currentQty);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition border border-red-200 dark:border-red-900"
                                  >
                                    Quarantine / Adjust
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Reorder Suggestions */}
          {activeTab === 'reorder' && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white">
                Low Stock &amp; Suggested Reorder Points
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                  <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-4 text-center">Current Total Stock</th>
                      <th className="py-3 px-4 text-center">Min Threshold</th>
                      <th className="py-3 px-4 text-center">Suggested PO Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {reorderList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          All medicine stock levels are sufficient.
                        </td>
                      </tr>
                    ) : (
                      reorderList.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-red-600 dark:text-red-400">
                            {item.totalStock}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500 dark:text-slate-400">
                            {item.minStock || 10}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                            {Math.max((item.minStock || 10) * 2 - item.totalStock, 10)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Stock Movements Ledger */}
          {activeTab === 'movements' && (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white">
                Audit Trail &amp; Stock Movements Ledger
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-4 font-mono">Batch</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-right">Qty Change</th>
                      <th className="py-3 px-4">Reason / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          No stock movement history recorded yet.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {formatDate(m.createdAt, 'dd-MM-yy HH:mm')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{m.medicine?.name}</td>
                          <td className="py-3 px-4 font-mono text-sky-600 dark:text-sky-400">{m.batch?.batchNumber}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {m.movementType}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              m.qty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {m.qty > 0 ? `+${m.qty}` : m.qty}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                            {m.reason || m.referenceType || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Modal: Physical Stock Adjustment */}
        {adjustmentModal && canManage && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Boxes className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Adjust Physical Batch Stock</h3>
                </div>
                <button
                  onClick={() => setAdjustmentModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplyAdjustment} className="space-y-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{adjustmentModal.medicine?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Batch: {adjustmentModal.batchNumber} | Current Stock: {adjustmentModal.currentQty}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Physical Count Qty *
                  </label>
                  <input
                    required
                    type="number" onFocus={(e) => e.target.select()}
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  >
                    {Object.values(AdjustmentReason).map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAdjustmentModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition"
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
