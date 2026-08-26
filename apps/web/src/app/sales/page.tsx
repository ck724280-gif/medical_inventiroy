'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Receipt,
  Printer,
  FileDown,
  MessageCircle,
  Edit,
  Trash2,
  X,
  Save,
  Calendar,
  CreditCard,
  User,
  FileText,
  Send,
  Sparkles,
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
import { useBrandingStore } from '../../stores/branding-store';
import { formatDate, formatCurrency, buildWhatsAppUrl } from '@medical-inventory/shared-utils';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { extractDataArray } from '../../lib/utils';

export default function SalesPage() {
  const { selectedBranchId, isSuperAdmin } = useAuthStore();
  const { name: storeName } = useBrandingStore();
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // WhatsApp Share Modal
  const [whatsAppModal, setWhatsAppModal] = useState<any | null>(null);
  const [targetPhone, setTargetPhone] = useState('');

  // Super Admin Edit State
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    customerId: '',
    patientName: '',
    doctorName: '',
    paymentStatus: 'PAID',
    paymentMode: 'CASH',
    paidAmount: 0,
    createdAt: '',
    notes: '',
    items: [] as any[],
  });

  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-list', selectedBranchId, search],
    queryFn: async () => {
      const res = await apiClient.get('/sales', {
        params: {
          branchId: selectedBranchId || undefined,
          search: search || undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-all'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      return res.data;
    },
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-list-all'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return res.data;
    },
  });

  const sales = extractDataArray(salesData);
  const customers = extractDataArray(customersData);
  const medicines = extractDataArray(medicinesData);

  const handlePrintThermal = async (id: string) => {
    try {
      const res = await apiClient.get(`/sales/${id}/receipt`);
      setActiveReceipt(res.data?.data || res.data);
    } catch (e) {
      alert('Failed to load receipt.');
    }
  };

  const handleDownloadPdf = (id: string) => {
    window.open(`/receipt/${id}?print=true`, '_blank');
  };

  const triggerWhatsAppRedirect = (sale: any, phone: string) => {
    if (!phone || !phone.trim()) {
      alert('Please enter a valid mobile number.');
      return;
    }

    const currentStore = storeName || 'Pharmacy & Healthcare';
    const grandTotal = Number(sale.totalAmount || 0);
    const paidAmount = (sale.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, grandTotal - paidAmount);
    const receiptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/receipt/${sale.id}`;

    let message = '';
    if (balanceDue > 0) {
      message = `🏥 *${currentStore.toUpperCase()} - PAYMENT REMINDER & INVOICE*\n` +
        `----------------------------------------\n` +
        `📄 *Invoice:* #${sale.invoiceNumber}\n` +
        `📅 *Date:* ${formatDate(sale.createdAt)}\n` +
        `👤 *Customer:* ${sale.customer?.name || 'Valued Customer'}\n` +
        `💵 *Total Bill:* Rs. ${grandTotal.toFixed(2)}\n` +
        `✅ *Paid Amount:* Rs. ${paidAmount.toFixed(2)}\n` +
        `⚠️ *Pending Balance Due:* Rs. ${balanceDue.toFixed(2)}\n\n` +
        `Please pay the remaining balance of *Rs. ${balanceDue.toFixed(2)}* via UPI / Cash at your earliest convenience.\n\n` +
        `📥 *View & Download Digital Tax Receipt:*\n` +
        `${receiptUrl}\n\n` +
        `Thank you for choosing ${currentStore}! Get Well Soon.`;
    } else {
      message = `🏥 *${currentStore.toUpperCase()} - TAX INVOICE*\n` +
        `----------------------------------------\n` +
        `📄 *Invoice:* #${sale.invoiceNumber}\n` +
        `📅 *Date:* ${formatDate(sale.createdAt)}\n` +
        `👤 *Customer:* ${sale.customer?.name || 'Valued Customer'}\n` +
        `💵 *Total Amount:* Rs. ${grandTotal.toFixed(2)}\n` +
        `✅ *Payment Status:* PAID IN FULL\n\n` +
        `📥 *View & Download Digital Tax Receipt:*\n` +
        `${receiptUrl}\n\n` +
        `Thank you for choosing ${currentStore}! Get Well Soon.`;
    }

    const waUrl = buildWhatsAppUrl(phone.trim(), message);
    window.open(waUrl, '_blank');
    setWhatsAppModal(null);
  };

  const handleWhatsAppShare = (sale: any) => {
    if (sale.customer?.mobile) {
      triggerWhatsAppRedirect(sale, sale.customer.mobile);
    } else {
      setTargetPhone('');
      setWhatsAppModal(sale);
    }
  };

  const startEdit = (sale: any) => {
    setEditingInvoice(sale);
    const localDate = new Date(sale.createdAt);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);

    const paid = (sale.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    setEditForm({
      invoiceNumber: sale.invoiceNumber || '',
      customerId: sale.customerId || '',
      patientName: sale.prescriptionRecord?.patientName || '',
      doctorName: sale.prescriptionRecord?.doctorName || '',
      paymentStatus: sale.paymentStatus || 'PAID',
      paymentMode: sale.payments?.[0]?.paymentMode || 'CASH',
      paidAmount: paid,
      createdAt: localISOTime,
      notes: sale.notes || '',
      items: (sale.items || []).map((item: any) => ({
        id: item.id,
        medicineId: item.medicineId,
        batchId: item.batchId,
        medicineName: item.medicine?.name || 'Medicine',
        batchNumber: item.batch?.batchNumber || 'BT-001',
        qty: item.qty,
        rate: item.rate,
        mrp: item.mrp || item.rate,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent || 0,
        lineTotal: item.lineTotal,
      })),
    });
  };

  const handleEditItemChange = (idx: number, field: string, val: any) => {
    const updated = [...editForm.items];
    updated[idx] = { ...updated[idx], [field]: val };

    const qty = Number(updated[idx].qty || 1);
    const rate = Number(updated[idx].rate || 0);
    const disc = Number(updated[idx].discountPercent || 0);
    const tax = Number(updated[idx].taxPercent || 0);

    const itemSubtotal = qty * rate;
    const discVal = (itemSubtotal * disc) / 100;
    const taxable = itemSubtotal - discVal;
    const itemTax = (taxable * tax) / 100;
    updated[idx].lineTotal = taxable + itemTax;

    setEditForm({ ...editForm, items: updated });
  };

  const removeEditItemRow = (idx: number) => {
    if (editForm.items.length <= 1) {
      alert('Invoice must contain at least 1 item.');
      return;
    }
    setEditForm({
      ...editForm,
      items: editForm.items.filter((_, i) => i !== idx),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/sales/${editingInvoice.id}`, editForm);
      setEditingInvoice(null);
      refetch();
      alert('Sales Invoice updated successfully by Super Admin.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update invoice.');
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNum: string) => {
    if (
      !confirm(
        `Warning: Are you sure you want to delete invoice ${invoiceNum}?\n\nThis will restore the inventory stock of all medicines in this invoice and reverse customer credit balances. This action is irreversible.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/sales/${id}`);
      refetch();
      alert('Invoice deleted successfully and stock restored.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  const isUserSuperAdmin = isSuperAdmin();

  const columns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      accessor: (row) => (
        <span className="font-mono font-bold text-accent hover:underline cursor-pointer">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      accessor: (row) => (
        <span className="font-mono text-text-secondary text-xs">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">
            {row.customer?.name || 'Walk-in Customer'}
          </p>
          {row.customer?.mobile && (
            <p className="text-[11px] text-text-muted font-mono">{row.customer.mobile}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      accessor: (row) => (
        <span className="font-mono text-text-secondary">
          {row._count?.items || row.items?.length || 0}
        </span>
      ),
    },
    {
      key: 'taxAmount',
      header: 'Tax (₹)',
      align: 'right',
      accessor: (row) => (
        <span className="font-mono text-text-secondary">
          ₹{Number(row.taxAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      accessor: (row) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(row.totalAmount || 0)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      align: 'center',
      render: (row) => {
        const isPaid = row.paymentStatus === 'PAID';
        const isPartial = row.paymentStatus === 'PARTIAL';
        return (
          <Badge
            variant={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
            size="sm"
            dot
          >
            {row.paymentStatus || 'PAID'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleWhatsAppShare(row)}
            title="Send WhatsApp Invoice & Link"
            className="w-7 h-7 p-0 text-status-success hover:bg-status-success-bg"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrintThermal(row.id)}
            title="Print Thermal POS Receipt"
            className="w-7 h-7 p-0 text-text-secondary hover:text-text-primary"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadPdf(row.id)}
            title="View / Download Printable Tax Invoice PDF"
            className="w-7 h-7 p-0 text-accent hover:bg-accent-subtle"
          >
            <FileDown className="w-3.5 h-3.5" />
          </Button>
          {isUserSuperAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(row)}
                title="Super Admin Edit Invoice"
                className="w-7 h-7 p-0 text-status-warning hover:bg-status-warning-bg"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteInvoice(row.id, row.invoiceNumber)}
                title="Delete Invoice & Restore Stock"
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
            title="Sales & Invoices"
            description="View customer tax bills, send WhatsApp receipts with secure links, reprint thermal receipts, and export PDF records."
            badge={
              <Badge variant="outline" size="sm" className="font-mono">
                {sales.length} Invoices
              </Badge>
            }
          />

          {/* Search Bar */}
          <Card elevation="flat" className="p-3">
            <SmartAutocomplete
              placeholder="Search by Invoice Number, Customer Name, Mobile (e.g. 98...)... (First char instant)"
              value={search}
              onChange={(val) => setSearch(val)}
              onClear={() => setSearch('')}
              fetchResults={async (q, signal) => {
                const res = await apiClient.get('/search/invoices', {
                  params: { q, branchId: selectedBranchId || undefined, limit: 12 },
                  signal,
                });
                const list = res.data || [];
                return list.map((inv: any) => ({
                  id: inv.id,
                  title: inv.invoiceNumber,
                  subtitle: `${inv.customer?.name || 'Walk-in'} ${inv.customer?.mobile ? `(${inv.customer.mobile})` : ''} • Total: ₹${(inv.totalAmount || 0).toFixed(2)}`,
                  badge: inv.paymentStatus,
                  metadata: inv,
                }));
              }}
              onSelect={(item) => {
                setSearch(item.title);
              }}
              inputClassName="!py-2 !text-xs !rounded-lg"
            />
          </Card>

          {/* Sales Table */}
          <DataTable
            columns={columns}
            data={sales}
            isLoading={isLoading}
            emptyTitle="No sales invoices recorded"
            emptyDescription="There are no sales records matching your search or filters."
            compact
          />
        </main>

        {/* WhatsApp Mobile Prompt Modal */}
        {whatsAppModal && (
          <Modal
            isOpen={Boolean(whatsAppModal)}
            onClose={() => setWhatsAppModal(null)}
            title={
              <div className="flex items-center gap-2 text-status-success">
                <MessageCircle className="w-5 h-5" />
                <span>Send WhatsApp Receipt</span>
              </div>
            }
            description={`Enter the customer's 10-digit WhatsApp number to send invoice #${whatsAppModal.invoiceNumber}`}
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button variant="secondary" onClick={() => setWhatsAppModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-status-success hover:opacity-90"
                  onClick={() => triggerWhatsAppRedirect(whatsAppModal, targetPhone)}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send to WhatsApp
                </Button>
              </div>
            }
          >
            <div className="space-y-3 py-2">
              <Input
                label="WhatsApp Mobile Number *"
                type="tel"
                placeholder="9876543210"
                autoFocus
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
              />
            </div>
          </Modal>
        )}

        {/* Thermal Receipt Preview & Print Modal */}
        {activeReceipt && (
          <ThermalReceiptPreview data={activeReceipt} onClose={() => setActiveReceipt(null)} />
        )}

        {/* Super Admin Comprehensive Edit Invoice Modal */}
        {editingInvoice && (
          <Modal
            isOpen={Boolean(editingInvoice)}
            onClose={() => setEditingInvoice(null)}
            size="xl"
            title={
              <div className="flex items-center gap-2 text-accent">
                <Edit className="w-5 h-5" />
                <span>Super Admin Edit Invoice #{editingInvoice.invoiceNumber}</span>
              </div>
            }
            description="Full override for invoice number, items, pricing, date, and payment ledger."
          >
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              {/* Top Row: Invoice #, Date, Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Invoice #"
                  required
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                />

                <Input
                  label="Date & Time"
                  type="datetime-local"
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  value={editForm.createdAt}
                  onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                />

                <Select
                  label="Customer"
                  value={editForm.customerId}
                  onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                  options={[
                    { label: 'Walk-in Customer (General)', value: '' },
                    ...customers.map((cust: any) => ({
                      label: `${cust.name} (${cust.mobile || 'No Mobile'})`,
                      value: cust.id,
                    })),
                  ]}
                />
              </div>

              {/* Patient & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Patient Name"
                  placeholder="e.g. Rahul Kumar"
                  value={editForm.patientName}
                  onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })}
                />
                <Input
                  label="Doctor Name"
                  placeholder="e.g. Dr. A. K. Verma"
                  value={editForm.doctorName}
                  onChange={(e) => setEditForm({ ...editForm, doctorName: e.target.value })}
                />
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary text-xs">Invoice Items:</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editForm.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-surface-raised rounded-lg border border-border grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] text-text-muted block mb-0.5">Medicine Name</label>
                        <input
                          type="text"
                          disabled
                          value={`${item.medicineName} (${item.batchNumber})`}
                          className="w-full px-2 py-1 bg-surface-sunken rounded-md text-text-secondary text-xs border border-border cursor-not-allowed"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <label className="text-[10px] text-text-muted block mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleEditItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 bg-surface-base border border-border rounded-md font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <label className="text-[10px] text-text-muted block mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleEditItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-surface-base border border-border rounded-md font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] text-text-muted block mb-0.5">Disc %</label>
                        <input
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) =>
                            handleEditItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-base border border-border rounded-md font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-right">
                        <label className="text-[10px] text-text-muted block mb-0.5">Line Total</label>
                        <span className="font-mono font-bold text-text-primary">
                          ₹{Number(item.lineTotal || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => removeEditItemRow(idx)}
                          className="w-6 h-6 p-0 text-status-error hover:bg-status-error-bg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments & Financial Adjustment */}
              <Card elevation="flat" className="p-3 space-y-3 bg-surface-raised">
                <span className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Payment &amp; Ledger Adjustment
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Paid Amount (₹)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paidAmount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, paidAmount: parseFloat(e.target.value) || 0 })
                    }
                  />

                  <Select
                    label="Payment Mode"
                    value={editForm.paymentMode}
                    onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                    options={[
                      { label: 'CASH', value: 'CASH' },
                      { label: 'UPI', value: 'UPI' },
                      { label: 'CARD', value: 'CARD' },
                      { label: 'BANK TRANSFER', value: 'BANK_TRANSFER' },
                      { label: 'CHEQUE', value: 'CHEQUE' },
                    ]}
                  />

                  <Select
                    label="Payment Status"
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    options={[
                      { label: 'PAID', value: 'PAID' },
                      { label: 'PARTIAL', value: 'PARTIAL' },
                      { label: 'UNPAID', value: 'UNPAID' },
                    ]}
                  />
                </div>
              </Card>

              {/* Notes/Remarks */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Notes / Audit Reason
                </label>
                <textarea
                  placeholder="Reason for Super Admin modification..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingInvoice(null)}
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
