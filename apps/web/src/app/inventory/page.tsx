'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldCheck,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import {
  PageHeader,
  DataTable,
  Column,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Modal,
} from '../../components/ui';
import { SmartAutocomplete } from '../../components/ui/smart-autocomplete';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { BatchStatus, AdjustmentReason } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency } from '@medical-inventory/shared-utils';
import { extractDataArray } from '../../lib/utils';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('inventory.adjust');

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
        params: { branchId: selectedBranchId || undefined, limit: 100 },
      });
      return res.data;
    },
    enabled: activeTab === 'batches',
  });

  // 2. Expiry Dashboard Query
  const { data: expiryData, isLoading: expiryLoading } = useQuery({
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
  const { data: reorderData, isLoading: reorderLoading } = useQuery({
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
  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/movements', {
        params: { branchId: selectedBranchId || undefined, limit: 100 },
      });
      return res.data;
    },
    enabled: activeTab === 'movements',
  });

  const batches = extractDataArray(batchesData);
  const movements = extractDataArray(movementsData);

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/inventory/adjustments', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-expiry'] });
      setAdjustmentModal(null);
      alert('Batch stock adjusted successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to adjust stock.');
    },
  });

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('You do not have permission to adjust stock levels.');
      return;
    }
    if (!adjustmentModal) return;

    const existingQty = Number(adjustmentModal.currentQty || 0);
    const targetQty = Number(adjustmentQty);
    const delta = targetQty - existingQty;

    adjustMutation.mutate({
      branchId: selectedBranchId || adjustmentModal.branchId,
      medicineId: adjustmentModal.medicineId || adjustmentModal.medicine?.id,
      batchId: adjustmentModal.id,
      newQty: targetQty,
      adjustmentQty: delta,
      reason: adjustmentReason,
      notes: `Manual stock adjustment from ${existingQty} to ${targetQty}`,
    });
  };

  const reorderList = [
    ...(Array.isArray(reorderData?.outOfStock) ? reorderData.outOfStock : []),
    ...(Array.isArray(reorderData?.criticalStock) ? reorderData.criticalStock : []),
    ...(Array.isArray(reorderData?.lowStock) ? reorderData.lowStock : []),
  ];

  // Tab 1 Columns: Batches
  const batchColumns: Column<any>[] = [
    {
      key: 'medicine',
      header: 'Medicine / SKU',
      render: (b) => (
        <div>
          <p className="font-bold text-text-primary">{b.medicine?.name}</p>
          <p className="text-[10px] text-text-muted font-mono">{b.medicine?.sku}</p>
        </div>
      ),
    },
    {
      key: 'batchNumber',
      header: 'Batch No',
      accessor: (b) => (
        <span className="font-mono font-bold text-accent">
          {b.batchNumber}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      sortable: true,
      render: (b) => {
        const exp = new Date(b.expiryDate);
        const now = new Date();
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const isExpired = diffDays <= 0;
        const isNear = diffDays > 0 && diffDays <= 90;

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-text-secondary">
              {formatDate(b.expiryDate)}
            </span>
            <Badge
              variant={isExpired ? 'error' : isNear ? 'warning' : 'success'}
              size="sm"
            >
              {isExpired ? 'Expired' : isNear ? `${diffDays}d left` : 'OK'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'currentQty',
      header: 'Available Stock',
      align: 'center',
      accessor: (b) => (
        <span className="font-mono font-bold text-text-primary">
          {b.currentQty} {b.medicine?.baseUnit?.abbreviation || 'PCS'}
        </span>
      ),
    },
    {
      key: 'purchaseRate',
      header: 'Purchase Rate',
      align: 'right',
      accessor: (b) => (
        <span className="font-mono text-text-secondary">
          {formatCurrency(b.purchaseRate || 0)}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Selling Rate',
      align: 'right',
      accessor: (b) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(b.sellingPrice || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (b) => (
        <Badge
          variant={b.status === BatchStatus.ACTIVE ? 'success' : 'error'}
          size="sm"
        >
          {b.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'center',
      render: (b) => {
        if (!canManage) {
          return (
            <span className="text-text-muted p-1" title="Super Admin restricted">
              <Lock className="w-3.5 h-3.5 opacity-50 mx-auto" />
            </span>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdjustmentModal(b);
              setAdjustmentQty(b.currentQty);
            }}
            className="text-accent hover:bg-accent-subtle"
          >
            Adjust Stock
          </Button>
        );
      },
    },
  ];

  // Tab 2 Columns: Expiry
  const expiryList = [
    ...(expiryData?.expired || []),
    ...(expiryData?.expiring30 || []),
  ];

  const expiryColumns: Column<any>[] = [
    {
      key: 'medicine',
      header: 'Medicine',
      accessor: (b) => (
        <span className="font-bold text-text-primary">
          {b.medicine?.name}
        </span>
      ),
    },
    {
      key: 'batchNumber',
      header: 'Batch No',
      accessor: (b) => (
        <span className="font-mono text-accent font-semibold">
          {b.batchNumber}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      accessor: (b) => (
        <span className="font-mono text-text-secondary">
          {formatDate(b.expiryDate)}
        </span>
      ),
    },
    {
      key: 'currentQty',
      header: 'Current Stock',
      align: 'center',
      accessor: (b) => (
        <span className="font-mono font-bold text-text-primary">
          {b.currentQty}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value (₹)',
      align: 'right',
      accessor: (b) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(b.currentQty * (b.purchasePrice || b.purchaseRate || 0))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (b) => {
        const isExp = new Date(b.expiryDate) < new Date();
        return (
          <Badge
            variant={isExp ? 'error' : 'warning'}
            size="sm"
          >
            {isExp ? 'EXPIRED' : 'EXPIRING SOON'}
          </Badge>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'center',
      render: (b) => {
        if (!canManage) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdjustmentModal(b);
              setAdjustmentQty(b.currentQty);
            }}
            className="text-status-error border-status-error-border hover:bg-status-error-bg"
          >
            Quarantine / Adjust
          </Button>
        );
      },
    },
  ];

  // Tab 3 Columns: Reorder
  const reorderColumns: Column<any>[] = [
    {
      key: 'medicine',
      header: 'Medicine',
      accessor: (item) => (
        <span className="font-bold text-text-primary">
          {item.name}
        </span>
      ),
    },
    {
      key: 'totalStock',
      header: 'Current Total Stock',
      align: 'center',
      accessor: (item) => (
        <span className="font-mono font-bold text-status-error">
          {item.totalStock}
        </span>
      ),
    },
    {
      key: 'minStock',
      header: 'Min Threshold',
      align: 'center',
      accessor: (item) => (
        <span className="font-mono text-text-secondary">
          {item.minStock || 10}
        </span>
      ),
    },
    {
      key: 'suggestedQty',
      header: 'Suggested PO Qty',
      align: 'center',
      accessor: (item) => (
        <span className="font-mono font-bold text-accent">
          {Math.max((item.minStock || 10) * 2 - item.totalStock, 10)}
        </span>
      ),
    },
  ];

  // Tab 4 Columns: Movements
  const movementColumns: Column<any>[] = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      accessor: (m) => (
        <span className="font-mono text-text-secondary text-xs">
          {formatDate(m.createdAt, 'dd-MM-yy HH:mm')}
        </span>
      ),
    },
    {
      key: 'medicine',
      header: 'Medicine',
      accessor: (m) => (
        <span className="font-bold text-text-primary">
          {m.medicine?.name}
        </span>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      accessor: (m) => (
        <span className="font-mono text-accent">
          {m.batch?.batchNumber || '—'}
        </span>
      ),
    },
    {
      key: 'movementType',
      header: 'Type',
      align: 'center',
      render: (m) => (
        <Badge variant="default" size="sm">
          {m.movementType}
        </Badge>
      ),
    },
    {
      key: 'qty',
      header: 'Qty Change',
      align: 'right',
      render: (m) => (
        <span
          className={`font-mono font-bold ${
            m.qty > 0 ? 'text-status-success' : 'text-status-error'
          }`}
        >
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Ref',
      render: (m) => (
        <span className="text-text-secondary text-xs truncate max-w-xs block">
          {m.reason || m.referenceType || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-surface-page text-text-primary font-sans transition-colors duration-200 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 pb-16 lg:pb-0 animate-fade-in">
          {/* Header */}
          <PageHeader
            title="Batch & Inventory Management"
            description="FEFO-prioritized batch stock, expiry tracking, reorder points, and stock movements ledger."
            badge={
              canManage ? (
                <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                  Manager Access
                </Badge>
              ) : (
                <Badge variant="outline" size="sm" icon={<Lock className="w-3 h-3" />}>
                  Read Only
                </Badge>
              )
            }
          />

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2 overflow-x-auto">
            {[
              { id: 'batches', label: 'All Active Batches (FEFO)', icon: Boxes },
              { id: 'expiry', label: 'Expiry Dashboard', icon: Clock },
              { id: 'reorder', label: 'Reorder / Low Stock', icon: AlertTriangle },
              { id: 'movements', label: 'Stock Movements Ledger', icon: ArrowUpDown },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="rounded-b-none border-b-2 whitespace-nowrap"
                  leftIcon={<Icon className="w-4 h-4" />}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Real-time Inventory Search Bar */}
          <Card elevation="flat" className="p-3">
            <SmartAutocomplete
              placeholder="Instant Search: Batch Number, Medicine Name, SKU, Supplier... (First char instant)"
              value={search}
              onChange={(val) => setSearch(val)}
              onClear={() => setSearch('')}
              fetchResults={async (q, signal) => {
                const res = await apiClient.get('/search/universal', {
                  params: { q, branchId: selectedBranchId || undefined, limit: 10 },
                  signal,
                });
                return (res.data?.results || []).map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle,
                  badge: item.badge,
                  metadata: item.metadata,
                }));
              }}
              onSelect={(item) => {
                setSearch(item.title);
              }}
              inputClassName="!py-2 !text-xs !rounded-lg"
            />
          </Card>

          {/* TAB 1: Batches Table */}
          {activeTab === 'batches' && (
            <DataTable
              columns={batchColumns}
              data={batches}
              isLoading={batchesLoading}
              emptyTitle="No active batches found"
              emptyDescription="No active batches found in this branch matching your query."
              compact
            />
          )}

          {/* TAB 2: Expiry Dashboard */}
          {activeTab === 'expiry' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card elevation="raised" className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-status-error-bg text-status-error flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Already Expired</p>
                      <h3 className="text-2xl font-bold text-status-error">
                        {expiryData?.summary?.expiredCount ?? expiryData?.expiredCount ?? expiryData?.expired?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </Card>

                <Card elevation="raised" className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-status-warning-bg text-status-warning flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Expiring in 30 Days</p>
                      <h3 className="text-2xl font-bold text-status-warning">
                        {expiryData?.summary?.expiring30Count ?? expiryData?.expiring30DaysCount ?? expiryData?.expiring30?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </Card>

                <Card elevation="raised" className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-status-info-bg text-status-info flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Expiring in 90 Days</p>
                      <h3 className="text-2xl font-bold text-status-info">
                        {expiryData?.summary?.expiring90Count ?? expiryData?.expiring90DaysCount ?? expiryData?.expiring90?.length ?? 0} Batches
                      </h3>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Expired / Near Expiry Batches Action Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary text-sm">Expired &amp; Near-Expiry Batches List</h3>
                  <span className="text-xs text-text-muted">Action items for quarantine or return</span>
                </div>
                <DataTable
                  columns={expiryColumns}
                  data={expiryList}
                  isLoading={expiryLoading}
                  emptyTitle="No expired or near-expiry batches"
                  emptyDescription="All active batch stock in inventory is well within expiration limits."
                  compact
                />
              </div>
            </div>
          )}

          {/* TAB 3: Reorder Suggestions */}
          {activeTab === 'reorder' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-text-primary text-sm">Low Stock &amp; Suggested Reorder Points</h3>
              <DataTable
                columns={reorderColumns}
                data={reorderList}
                isLoading={reorderLoading}
                emptyTitle="Stock levels sufficient"
                emptyDescription="All medicine stock levels across branches meet or exceed minimum reorder thresholds."
                compact
              />
            </div>
          )}

          {/* TAB 4: Stock Movements Ledger */}
          {activeTab === 'movements' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-text-primary text-sm">Audit Trail &amp; Stock Movements Ledger</h3>
              <DataTable
                columns={movementColumns}
                data={movements}
                isLoading={movementsLoading}
                emptyTitle="No stock movements recorded"
                emptyDescription="No inventory transactions or stock adjustments found in this ledger."
                compact
              />
            </div>
          )}
        </main>

        {/* Modal: Physical Stock Adjustment */}
        {adjustmentModal && canManage && (
          <Modal
            isOpen={Boolean(adjustmentModal)}
            onClose={() => setAdjustmentModal(null)}
            size="md"
            title={
              <div className="flex items-center gap-2 text-accent">
                <Boxes className="w-5 h-5" />
                <span>Adjust Physical Batch Stock</span>
              </div>
            }
            description="Override physical inventory quantities and log audit reasons."
          >
            <form onSubmit={handleApplyAdjustment} className="space-y-4 pt-2">
              <Card elevation="flat" className="p-3 bg-surface-raised space-y-1">
                <p className="font-bold text-text-primary">{adjustmentModal.medicine?.name}</p>
                <p className="text-xs text-text-muted font-mono">
                  Batch: {adjustmentModal.batchNumber} | Current Stock: {adjustmentModal.currentQty}
                </p>
              </Card>

              <Input
                label="New Physical Count Qty *"
                required
                type="number"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
              />

              <Select
                label="Reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                options={Object.values(AdjustmentReason).map((r) => ({
                  label: r.replace(/_/g, ' '),
                  value: r,
                }))}
              />

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setAdjustmentModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={adjustMutation.isPending}
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Confirm Adjustment'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
