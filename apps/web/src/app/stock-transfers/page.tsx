'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Package,
} from 'lucide-react';
import Link from 'next/link';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { PageHeader } from '../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { apiClient } from '../../lib/api-client';
import { formatDate } from '@medical-inventory/shared-utils';
import { useAuthStore } from '../../stores/auth-store';
import { extractDataArray } from '../../lib/utils';

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Create Transfer Request State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [transferQty, setTransferQty] = useState<number | string>(10);
  const [transferNotes, setTransferNotes] = useState('');

  // 1. Fetch Stock Transfers
  const { data: transfers, isLoading } = useQuery({
    queryKey: ['stock-transfers-list', selectedBranchId, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/stock-transfers', {
        params: {
          branchId: selectedBranchId || undefined,
          status: statusFilter || undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const transferList = extractDataArray(transfers);

  // 2. Fetch Branches for Transfer Modal
  const { data: branchesData } = useQuery({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
    enabled: showCreateModal,
  });
  const branches = extractDataArray(branchesData);

  // 3. Fetch Medicines for Transfer Modal
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-select-transfer'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return res.data;
    },
    enabled: showCreateModal,
  });
  const medicines = extractDataArray(medicinesData);

  // 4. Fetch Batches for Selected Source Branch & Medicine
  const { data: sourceBatchesData } = useQuery({
    queryKey: ['source-batches', fromBranchId, selectedMedicineId],
    queryFn: async () => {
      if (!fromBranchId || !selectedMedicineId) return [];
      const res = await apiClient.get('/batches', {
        params: {
          branchId: fromBranchId,
          medicineId: selectedMedicineId,
          limit: 50,
        },
      });
      return res.data;
    },
    enabled: showCreateModal && !!fromBranchId && !!selectedMedicineId,
  });
  const sourceBatches = extractDataArray(sourceBatchesData);

  // Actions Mutations
  const createTransferMutation = useMutation({
    mutationFn: async () => {
      if (!fromBranchId || !toBranchId) {
        throw new Error('Please select both source and destination branches.');
      }
      if (fromBranchId === toBranchId) {
        throw new Error('Source and destination branches cannot be the same.');
      }
      if (!selectedMedicineId || !selectedBatchId) {
        throw new Error('Please select a medicine and batch to transfer.');
      }
      if (Number(transferQty) <= 0) {
        throw new Error('Transfer quantity must be greater than 0.');
      }

      const payload = {
        fromBranchId,
        toBranchId,
        notes: transferNotes || undefined,
        items: [
          {
            medicineId: selectedMedicineId,
            batchId: selectedBatchId,
            qty: Number(transferQty),
          },
        ],
      };

      const res = await apiClient.post('/stock-transfers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      setShowCreateModal(false);
      setSelectedMedicineId('');
      setSelectedBatchId('');
      setTransferQty(10);
      setTransferNotes('');
      alert('Inter-branch stock transfer request created successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to create transfer request.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/stock-transfers/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      alert('Transfer approved successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to approve transfer');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/stock-transfers/${id}/dispatch`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      alert('Stock transfer dispatched successfully. Stock reserved from source branch.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to dispatch transfer');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/stock-transfers/${id}/receive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers-list'] });
      alert('Stock transfer received successfully. Stock credited to destination branch.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to receive transfer');
    },
  });

  const filtered = transferList.filter((t: any) => {
    const term = searchTerm.toLowerCase();
    return (
      t.fromBranch?.name?.toLowerCase().includes(term) ||
      t.toBranch?.name?.toLowerCase().includes(term) ||
      t.id?.toLowerCase().includes(term)
    );
  });

  const selectedBatchObj = sourceBatches.find((b: any) => b.id === selectedBatchId);

  return (
    <div className="flex h-screen bg-surface-page text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <PageHeader
            title="Inter-Branch Stock Transfers"
            description="Request stock from any branch, approve inter-branch allocations, dispatch in-transit shipments, and receive into local stock."
            badge={<Badge variant="outline">{transferList.length} Transfers</Badge>}
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (branches.length >= 2) {
                    setFromBranchId(branches[1]?.id || branches[0]?.id);
                    setToBranchId(branches[0]?.id || branches[1]?.id);
                  }
                  setShowCreateModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Transfer Request
              </Button>
            }
          />

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-base p-4 border border-border-default rounded-xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search by branch name or transfer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-page border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary font-medium"
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested (Pending Approval)</option>
              <option value="APPROVED">Approved (Ready to Dispatch)</option>
              <option value="DISPATCHED">Dispatched (In-Transit)</option>
              <option value="COMPLETED">Completed (Received)</option>
              <option value="CANCELLED">Cancelled / Denied</option>
            </select>
          </div>

          {/* Transfers Table */}
          <Card className="bg-surface-base border-border-default shadow-sm">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-accent-primary" />
                Inter-Branch Stock Movement Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-raised text-text-muted uppercase text-[10px] font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-3 px-4">Transfer ID</th>
                    <th className="py-3 px-4">Source Branch (From)</th>
                    <th className="py-3 px-4">Destination (To)</th>
                    <th className="py-3 px-4">Medicines &amp; Qty</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-primary">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        Loading stock transfers...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        No stock transfers found. Click &quot;New Transfer Request&quot; to initiate one.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-raised transition">
                        <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                          #{t.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {t.fromBranch?.name || 'Branch'} ({t.fromBranch?.code || '—'})
                        </td>
                        <td className="py-3 px-4 font-semibold text-text-primary">
                          {t.toBranch?.name || 'Branch'} ({t.toBranch?.code || '—'})
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {t.items?.length > 0 ? (
                            <div>
                              <span className="font-semibold text-text-primary">{t.items[0]?.medicine?.name}</span>
                              <span className="text-[10px] text-text-muted ml-1 font-mono">({t.items[0]?.qty} units)</span>
                              {t.items.length > 1 && (
                                <span className="text-[10px] text-accent-primary ml-1 font-bold">+{t.items.length - 1} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted">0 items</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-text-muted font-mono">{formatDate(t.createdAt)}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              t.status === 'COMPLETED' || t.status === 'RECEIVED'
                                ? 'success'
                                : t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT'
                                ? 'warning'
                                : t.status === 'APPROVED'
                                ? 'info'
                                : t.status === 'CANCELLED'
                                ? 'error'
                                : 'default'
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {(t.status === 'REQUESTED' || t.status === 'DRAFT') && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(t.id)}
                              className="text-[11px] py-1 px-2"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                          )}
                          {t.status === 'APPROVED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={dispatchMutation.isPending}
                              onClick={() => dispatchMutation.mutate(t.id)}
                              className="text-[11px] py-1 px-2"
                            >
                              <Send className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Dispatch (Send)
                            </Button>
                          )}
                          {(t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT') && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={receiveMutation.isPending}
                              onClick={() => receiveMutation.mutate(t.id)}
                              className="text-[11px] py-1 px-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Receive Stock
                            </Button>
                          )}
                          <Link
                            href={`/stock-transfers/${t.id}`}
                            className="inline-flex items-center text-accent-primary hover:underline font-semibold text-xs ml-2"
                          >
                            Details →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* New Transfer Request Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface-base border border-border-default rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scale-up">
                <div className="flex justify-between items-center border-b border-border-default pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-accent-primary" />
                    <h3 className="font-bold text-base text-text-primary">
                      Create Inter-Branch Stock Request
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Branch Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-muted mb-1">
                        Source Branch (From) *
                      </label>
                      <select
                        value={fromBranchId}
                        onChange={(e) => setFromBranchId(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-medium"
                      >
                        <option value="">Select Source Branch</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-muted mb-1">
                        Destination Branch (To) *
                      </label>
                      <select
                        value={toBranchId}
                        onChange={(e) => setToBranchId(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-medium"
                      >
                        <option value="">Select Destination Branch</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {fromBranchId && toBranchId && fromBranchId === toBranchId && (
                    <p className="text-status-error text-[11px] font-medium">
                      ⚠️ Source and Destination branches must be different.
                    </p>
                  )}

                  {/* Medicine Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Select Medicine to Transfer *
                    </label>
                    <select
                      value={selectedMedicineId}
                      onChange={(e) => {
                        setSelectedMedicineId(e.target.value);
                        setSelectedBatchId('');
                      }}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-medium"
                    >
                      <option value="">Choose medicine...</option>
                      {medicines.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.sku ? `(${m.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Selection */}
                  {selectedMedicineId && (
                    <div>
                      <label className="block text-[11px] font-semibold text-text-muted mb-1">
                        Select Available Batch in Source Branch *
                      </label>
                      {sourceBatches.length === 0 ? (
                        <div className="p-3 rounded-lg bg-surface-page border border-border-default text-text-muted text-[11px]">
                          No batches with positive stock found in selected Source Branch.
                        </div>
                      ) : (
                        <select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-medium"
                        >
                          <option value="">Choose batch...</option>
                          {sourceBatches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              Batch: {b.batchNumber} | Available: {b.currentQty} units | Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Transfer Quantity */}
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Transfer Quantity (Units) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedBatchObj ? selectedBatchObj.currentQty : 9999}
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary font-mono font-bold"
                    />
                    {selectedBatchObj && (
                      <p className="text-[10px] text-text-muted mt-1">
                        Max available in this batch: <span className="font-bold text-accent-primary">{selectedBatchObj.currentQty} units</span>
                      </p>
                    )}
                  </div>

                  {/* Notes / Reason */}
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">
                      Transfer Request Notes / Reason
                    </label>
                    <textarea
                      rows={2}
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="e.g. Urgent stock requisition for outpatient pharmacy..."
                      className="w-full px-3 py-2 bg-surface-page border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={
                      createTransferMutation.isPending ||
                      !fromBranchId ||
                      !toBranchId ||
                      fromBranchId === toBranchId ||
                      !selectedMedicineId ||
                      !selectedBatchId ||
                      Number(transferQty) <= 0
                    }
                    onClick={() => createTransferMutation.mutate()}
                  >
                    {createTransferMutation.isPending ? 'Submitting...' : 'Submit Transfer Request'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
