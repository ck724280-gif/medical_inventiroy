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
  TrendingDown,
  CheckCircle2,
  Receipt,
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
import { useBrandingStore } from '../../stores/branding-store';
import { ReturnCondition, PaymentMode } from '@medical-inventory/shared-types';
import { formatDate, formatCurrency, buildWhatsAppUrl } from '@medical-inventory/shared-utils';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { extractDataArray } from '../../lib/utils';

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const { name: storeName } = useBrandingStore();
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
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const returns = extractDataArray(returnsData);

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

    const currentStore = storeName || 'Pharmacy & Healthcare';
    const message = `🏥 *${currentStore.toUpperCase()} - SALES RETURN & REFUND RECEIPT*\n` +
      `----------------------------------------\n` +
      `📄 *Return #:* ${ret.returnNumber}\n` +
      `🧾 *Original Invoice:* #${ret.salesInvoice?.invoiceNumber || 'N/A'}\n` +
      `📅 *Date:* ${formatDate(ret.createdAt)}\n` +
      `👤 *Customer:* ${ret.customer?.name || 'Walk-in Customer'}\n` +
      `💵 *Refund Amount:* Rs. ${Number(ret.refundAmount || 0).toFixed(2)}\n` +
      `💳 *Refund Mode:* ${ret.refundMode || 'CASH'}\n` +
      `✅ *Status:* ${ret.status}\n\n` +
      `Your returned medicines have been accepted and refund processed.\n` +
      `Thank you for choosing ${currentStore}!`;

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

  const columns: Column<any>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      accessor: (r) => (
        <span className="font-mono font-bold text-accent">
          {r.returnNumber}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      accessor: (r) => (
        <span className="font-mono text-text-secondary text-xs">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'originalInvoice',
      header: 'Original Invoice',
      accessor: (r) => (
        <span className="font-mono text-accent">
          {r.salesInvoice?.invoiceNumber ? `#${r.salesInvoice.invoiceNumber}` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (r) => (
        <span className="font-medium text-text-primary">
          {r.customer?.name || 'Walk-in Customer'}
        </span>
      ),
    },
    {
      key: 'refundAmount',
      header: 'Refund Amount',
      align: 'right',
      accessor: (r) => (
        <span className="font-mono font-bold text-status-error">
          {formatCurrency(Number(r.refundAmount || 0))}
        </span>
      ),
    },
    {
      key: 'refundMode',
      header: 'Refund Mode',
      align: 'center',
      render: (r) => (
        <Badge variant="outline" size="sm">
          {r.refundMode || 'CASH'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <Badge
          variant={r.status === 'COMPLETED' ? 'success' : 'info'}
          size="sm"
          dot
        >
          {r.status || 'COMPLETED'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleWhatsAppShareReturn(r)}
            title="Send WhatsApp Return Receipt"
            className="w-7 h-7 p-0 text-status-success hover:bg-status-success-bg"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrintReturn(r.id)}
            title="Print Thermal Return Receipt"
            className="w-7 h-7 p-0 text-text-secondary hover:text-text-primary"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          {isUserSuperAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(r)}
                title="Super Admin Edit Return"
                className="w-7 h-7 p-0 text-status-warning hover:bg-status-warning-bg"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteReturn(r.id, r.returnNumber)}
                title="Delete Return & Reverse Stock"
                className="w-7 h-7 p-0 text-status-error hover:bg-status-error-bg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
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
            title="Sales Returns & Refunds"
            description="Process customer medicine returns against tax bills, restore inventory, and issue instant refunds or credit notes."
            actions={
              <Button
                variant="primary"
                onClick={() => {
                  setLoadedInvoice(null);
                  setReturnItems([]);
                  setInvoiceLookup('');
                  setCreateNotes('');
                  setCreateRefundMode(PaymentMode.CASH);
                  setShowModal(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Process Sales Return
              </Button>
            }
          />

          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card elevation="raised" className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted font-medium">Total Returns</p>
                <p className="text-2xl font-bold text-text-primary font-mono mt-1">
                  {totalReturnsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
            </Card>

            <Card elevation="raised" className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted font-medium">Total Refunded</p>
                <p className="text-2xl font-bold text-status-error font-mono mt-1">
                  {formatCurrency(totalRefundAmount)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-status-error-bg text-status-error flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </Card>

            <Card elevation="raised" className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted font-medium">Today&apos;s Returns</p>
                <p className="text-2xl font-bold text-status-success font-mono mt-1">
                  {todayReturnsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-status-success-bg text-status-success flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* Search Filter Bar */}
          <Card elevation="flat" className="p-3">
            <Input
              leadingIcon={<Search className="w-4 h-4 text-text-muted" />}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Return #, Original Invoice #, or Customer Name/Mobile..."
            />
          </Card>

          {/* Returns Table */}
          <DataTable
            columns={columns}
            data={returns}
            isLoading={isLoading}
            emptyTitle="No sales returns recorded"
            emptyDescription="There are no sales return records matching your search or branch filters."
            compact
          />
        </main>

        {/* Process Return Modal */}
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            size="xl"
            title={
              <div className="flex items-center gap-2 text-accent">
                <RotateCcw className="w-5 h-5" />
                <span>Process Customer Sales Return &amp; Refund</span>
              </div>
            }
            description="Lookup tax invoice number, specify return quantities, and issue refunds."
          >
            <div className="space-y-4 pt-2">
              {/* Lookup Invoice Section */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Lookup Tax Invoice Number *"
                    placeholder="e.g. INV-1001"
                    value={invoiceLookup}
                    onChange={(e) => setInvoiceLookup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupInvoice();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleLookupInvoice}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Lookup Invoice
                </Button>
              </div>

              {/* Loaded Invoice Details */}
              {loadedInvoice && (
                <div className="space-y-3">
                  <Card elevation="flat" className="p-3 bg-surface-raised grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted block">Invoice #:</span>
                      <span className="font-mono font-bold text-text-primary">{loadedInvoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Customer:</span>
                      <span className="font-semibold text-text-primary">{loadedInvoice.customer?.name || 'Walk-in'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Invoice Total:</span>
                      <span className="font-mono font-bold text-text-primary">{formatCurrency(loadedInvoice.totalAmount || 0)}</span>
                    </div>
                  </Card>

                  {/* Return Line Items */}
                  <div className="space-y-2">
                    <span className="font-semibold text-text-primary text-xs">Select Items to Return:</span>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {returnItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-surface-raised rounded-lg border border-border grid grid-cols-12 gap-2 items-center text-xs"
                        >
                          <div className="col-span-12 sm:col-span-4">
                            <p className="font-bold text-text-primary">{item.name}</p>
                            <p className="text-[10px] text-text-muted font-mono">
                              Batch: {item.batchNumber} | Sold: {item.soldQty} | Already Ret: {item.alreadyReturned}
                            </p>
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] text-text-muted block mb-0.5">Return Qty</label>
                            <input
                              type="number"
                              min="0"
                              max={item.maxReturnable}
                              value={item.returnQty}
                              onChange={(e) => {
                                const updated = [...returnItems];
                                const val = parseInt(e.target.value) || 0;
                                updated[idx].returnQty = Math.max(0, Math.min(val, item.maxReturnable));
                                setReturnItems(updated);
                              }}
                              className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                            />
                          </div>

                          <div className="col-span-4 sm:col-span-3">
                            <label className="text-[10px] text-text-muted block mb-0.5">Condition</label>
                            <select
                              value={item.condition}
                              onChange={(e) => {
                                const updated = [...returnItems];
                                updated[idx].condition = e.target.value;
                                setReturnItems(updated);
                              }}
                              className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-accent"
                            >
                              <option value={ReturnCondition.RESALABLE}>Resalable (Restock)</option>
                              <option value={ReturnCondition.DAMAGED}>Damaged (Discard)</option>
                              <option value={ReturnCondition.EXPIRED}>Expired (Quarantine)</option>
                            </select>
                          </div>

                          <div className="col-span-4 sm:col-span-3 text-right">
                            <label className="text-[10px] text-text-muted block mb-0.5">Refund (₹)</label>
                            <span className="font-mono font-bold text-status-error">
                              ₹{(Number(item.returnQty || 0) * Number(item.rate || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Refund Summary & Mode */}
                  <Card elevation="flat" className="p-3 bg-surface-raised space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-text-primary">Estimated Refund Total:</span>
                      <span className="font-mono font-extrabold text-status-error text-base">
                        {formatCurrency(estimatedRefundSum)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                      <Select
                        label="Refund Mode"
                        value={createRefundMode}
                        onChange={(e: any) => setCreateRefundMode(e.target.value)}
                        options={[
                          { label: 'Cash Refund', value: PaymentMode.CASH },
                          { label: 'UPI / Bank Transfer', value: PaymentMode.UPI },
                          { label: 'Store Credit / Adjust Ledger', value: PaymentMode.BANK_TRANSFER },
                        ]}
                      />

                      <Input
                        label="Return Reason / Remarks"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                        placeholder="e.g. Unopened medicine returned by customer"
                      />
                    </div>
                  </Card>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border flex justify-end gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="bg-status-error hover:opacity-90 text-white"
                      disabled={createReturnMutation.isPending || estimatedRefundSum <= 0}
                      onClick={() => createReturnMutation.mutate()}
                      leftIcon={<ArrowDownLeft className="w-4 h-4" />}
                    >
                      {createReturnMutation.isPending
                        ? 'Processing...'
                        : `Process Refund (${formatCurrency(estimatedRefundSum)})`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Thermal Receipt Preview Modal */}
        {activeReceipt && (
          <ThermalReceiptPreview data={activeReceipt} onClose={() => setActiveReceipt(null)} />
        )}

        {/* Super Admin Edit Return Modal */}
        {editingReturn && (
          <Modal
            isOpen={Boolean(editingReturn)}
            onClose={() => setEditingReturn(null)}
            size="md"
            title={
              <div className="flex items-center gap-2 text-accent">
                <Edit className="w-5 h-5" />
                <span>Super Admin Edit Return #{editingReturn.returnNumber}</span>
              </div>
            }
            description="Override refund financial metrics and audit notes."
          >
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <Input
                label="Return #"
                required
                value={editForm.returnNumber}
                onChange={(e) => setEditForm({ ...editForm, returnNumber: e.target.value })}
              />

              <Input
                label="Refund Amount (₹) *"
                type="number"
                step="0.01"
                min="0"
                required
                value={editForm.refundAmount}
                onChange={(e) => setEditForm({ ...editForm, refundAmount: parseFloat(e.target.value) || 0 })}
              />

              <Select
                label="Refund Mode"
                value={editForm.refundMode}
                onChange={(e) => setEditForm({ ...editForm, refundMode: e.target.value })}
                options={[
                  { label: 'CASH', value: 'CASH' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'CARD', value: 'CARD' },
                  { label: 'BANK TRANSFER', value: 'BANK_TRANSFER' },
                ]}
              />

              <Input
                label="Date & Time"
                type="datetime-local"
                value={editForm.createdAt}
                onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
              />

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Audit Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Reason for Super Admin modification..."
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent transition resize-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingReturn(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Super Admin Changes
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
