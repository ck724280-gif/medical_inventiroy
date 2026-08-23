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

  const columns: Column<any>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      accessor: (po) => (
        <span className="font-mono font-bold text-accent">
          {po.poNumber}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date Created',
      accessor: (po) => (
        <span className="font-mono text-text-secondary text-xs">
          {formatDate(po.createdAt)}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier Agency',
      accessor: (po) => (
        <span className="font-medium text-text-primary">
          {po.supplier?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => {
        const isReceived = po.status === 'FULLY_RECEIVED';
        const isSent = po.status === 'SENT';
        return (
          <Badge
            variant={isReceived ? 'success' : isSent ? 'info' : 'warning'}
            size="sm"
            icon={isReceived ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          >
            {isReceived ? 'CONVERTED / RECEIVED' : po.status}
          </Badge>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Estimated Amount',
      align: 'right',
      accessor: (po) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(po.totalAmount || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions / Convert',
      align: 'center',
      render: (po) => (
        <div className="flex items-center justify-center gap-2">
          {po.status !== 'FULLY_RECEIVED' && po.status !== 'CANCELLED' ? (
            <Button
              variant="primary"
              size="sm"
              className="bg-status-success hover:opacity-90 text-white"
              onClick={() => convertPoMutation.mutate(po.id)}
              disabled={convertPoMutation.isPending}
              title="Convert to Inward Purchase Bill"
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Convert to Bill
            </Button>
          ) : (
            <Badge variant="outline" size="sm" className="text-status-success border-status-success-border font-medium">
              <Check className="w-3 h-3 mr-1" /> Converted
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeletePo(po)}
            title="Delete Purchase Order"
            className="w-7 h-7 p-0 text-text-muted hover:text-status-error hover:bg-status-error-bg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
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
            title="Purchase Orders (PO)"
            description="Create supplier purchase orders and auto-convert to inward purchase bills with 1 click."
            actions={
              <Button
                variant="primary"
                onClick={() => {
                  setSupplierId('');
                  setExpectedDeliveryDate('');
                  setNotes('');
                  setItems([{ medicineId: '', orderedQty: 10, expectedRate: 0, taxPercent: 12 }]);
                  setShowCreateModal(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Purchase Order
              </Button>
            }
          />

          {/* Status Tabs & Search Filter */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              <Button
                variant={activeTab === 'ACTIVE' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('ACTIVE')}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                Active / Pending Orders
              </Button>
              <Button
                variant={activeTab === 'COMPLETED' ? 'primary' : 'ghost'}
                size="sm"
                className={activeTab === 'COMPLETED' ? 'bg-status-success hover:opacity-90' : ''}
                onClick={() => setActiveTab('COMPLETED')}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Completed / Inwarded Orders
              </Button>
              <Button
                variant={activeTab === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('ALL')}
                leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
              >
                All Orders
              </Button>
            </div>

            <Card elevation="flat" className="p-3">
              <Input
                leadingIcon={<Search className="w-4 h-4 text-text-muted" />}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PO # or Supplier..."
              />
            </Card>
          </div>

          {/* PO Table */}
          <DataTable
            columns={columns}
            data={purchaseOrders}
            isLoading={isLoading}
            emptyTitle={activeTab === 'ACTIVE' ? 'No active purchase orders' : 'No purchase orders found'}
            emptyDescription={
              activeTab === 'ACTIVE'
                ? 'All purchase orders have been converted or none have been created yet.'
                : 'There are no purchase orders matching your search or filters.'
            }
            compact
          />
        </main>

        {/* Create PO Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            size="xl"
            title={
              <div className="flex items-center gap-2 text-accent">
                <ClipboardList className="w-5 h-5" />
                <span>Create Supplier Purchase Order</span>
              </div>
            }
            description="Specify supplier, delivery expectations, notes, and ordered quantities."
          >
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Supplier Agency *"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  options={[
                    { label: 'Select Supplier...', value: '' },
                    ...suppliers.map((s: any) => ({
                      label: `${s.name} (Ph: ${s.phone || 'N/A'})`,
                      value: s.id,
                    })),
                  ]}
                />

                <Input
                  label="Expected Delivery Date"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />

                <div className="sm:col-span-2">
                  <Input
                    label="PO Notes / Instructions"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Urgent stock replenishment for upcoming seasonal rush"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary text-xs">Order Line Items:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={addItemRow}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface-raised rounded-lg border border-border grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="text-[10px] text-text-muted block mb-0.5">Medicine *</label>
                        <select
                          required
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
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent"
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
                        <label className="text-[10px] text-text-muted block mb-0.5">Ordered Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.orderedQty}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].orderedQty = parseInt(e.target.value) || 0;
                            setItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-text-muted block mb-0.5">Expected Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.expectedRate}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].expectedRate = parseFloat(e.target.value) || 0;
                            setItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <label className="text-[10px] text-text-muted block mb-0.5">Tax (%)</label>
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].taxPercent = parseFloat(e.target.value) || 0;
                            setItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="w-6 h-6 p-0 text-status-error hover:bg-status-error-bg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  disabled={createPoMutation.isPending}
                  onClick={() => createPoMutation.mutate()}
                  leftIcon={<ClipboardList className="w-4 h-4" />}
                >
                  {createPoMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
