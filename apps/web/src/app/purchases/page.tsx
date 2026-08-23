'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Barcode,
  Printer,
  FileText,
  AlertCircle,
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
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';
import { PaymentMode } from '@medical-inventory/shared-types';
// @ts-ignore
import ReactBarcode from 'react-barcode';

function PurchasesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { selectedBranchId } = useAuthStore();
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);

  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<any[]>([
    {
      medicineId: '',
      batchNumber: '',
      mfgDate: '',
      expiryDate: '',
      qty: 1,
      unitLevel: 'BOX',
      purchasePrice: 0,
      sellingPrice: 0,
      mrp: 0,
      taxPercent: 12,
    },
  ]);

  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [initialPaymentMode, setInitialPaymentMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);

  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);

  const [barcodeModal, setBarcodeModal] = useState<any | null>(null);
  const [barcodeLayout, setBarcodeLayout] = useState<'A4_30' | 'A4_24' | 'THERMAL'>('A4_30');
  const [barcodeQtyMode, setBarcodeQtyMode] = useState<'FILL_PAGE' | 'BATCH_QTY' | 'CUSTOM'>('FILL_PAGE');
  const [customLabelCount, setCustomLabelCount] = useState<number>(30);
  const labelPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const poConvertData = sessionStorage.getItem('medcare_po_convert');
      if (poConvertData) {
        try {
          const parsed = JSON.parse(poConvertData);
          setPurchaseOrderId(parsed.purchaseOrderId || parsed.id || null);
          setSupplierId(parsed.supplierId || '');
          setNotes(parsed.notes || '');
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            setItems(
              parsed.items.map((i: any) => ({
                medicineId: i.medicineId,
                batchNumber: i.batchNumber || '',
                mfgDate: i.mfgDate || '',
                expiryDate: i.expiryDate || '',
                qty: i.qty || 1,
                unitLevel: 'BOX',
                purchasePrice: i.purchasePrice || 0,
                sellingPrice: i.sellingPrice || 0,
                mrp: i.mrp || 0,
                taxPercent: i.taxPercent || 12,
              }))
            );
          }
          setShowCreateModal(true);
          sessionStorage.removeItem('medcare_po_convert');
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases-list', search, selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/purchases', {
        params: { branchId: selectedBranchId || undefined, search: search || undefined },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get('/medicines', { params: { limit: 200 } });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  const purchases = Array.isArray(purchasesData) ? purchasesData : [];
  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
  const medicines = Array.isArray(medicinesData) ? medicinesData : [];

  const createPurchaseMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const payload = {
        supplierId,
        branchId: selectedBranchId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        purchaseOrderId: purchaseOrderId || undefined,
        paidAmount: Number(initialPaidAmount || 0),
        paymentMode: initialPaymentMode,
        notes,
        items: items.map((item: any) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber || ('BT-' + Date.now().toString().slice(-4)),
          mfgDate: item.mfgDate ? new Date(item.mfgDate).toISOString() : new Date().toISOString(),
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
          qty: Number(item.qty || 1),
          unitLevel: item.unitLevel || 'BOX',
          purchasePrice: Number(item.purchasePrice || 0),
          sellingPrice: Number(item.sellingPrice || 0),
          mrp: Number(item.mrp || 0),
          taxPercent: Number(item.taxPercent || 0),
        })),
      };

      if (editingPurchase) {
        return apiClient.patch('/purchases/' + editingPurchase.id, payload);
      }
      return apiClient.post('/purchases' + (isDraft ? '?draft=true' : ''), payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      setShowCreateModal(false);
      setEditingPurchase(null);
      setSupplierId('');
      setInvoiceNumber('');
      setPurchaseOrderId(null);
      setInitialPaidAmount(0);
      setNotes('');
      setItems([
        {
          medicineId: '',
          batchNumber: '',
          mfgDate: '',
          expiryDate: '',
          qty: 1,
          unitLevel: 'BOX',
          purchasePrice: 0,
          sellingPrice: 0,
          mrp: 0,
          taxPercent: 12,
        },
      ]);
      const created = res.data?.data || res.data;
      if (created && Array.isArray(created.items) && created.items.length > 0 && !editingPurchase) {
        setBarcodeModal(created);
      } else {
        alert(editingPurchase ? 'Purchase invoice updated!' : 'Purchase stock inwarded successfully!');
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to save purchase');
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete('/purchases/' + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      alert('Purchase deleted successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete purchase');
    },
  });

  const handleOpenCreate = () => {
    setEditingPurchase(null);
    setSupplierId('');
    setInvoiceNumber('');
    setPurchaseOrderId(null);
    setInitialPaidAmount(0);
    setNotes('');
    setItems([
      {
        medicineId: '',
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        qty: 1,
        unitLevel: 'BOX',
        purchasePrice: 0,
        sellingPrice: 0,
        mrp: 0,
        taxPercent: 12,
      },
    ]);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingPurchase(p);
    setSupplierId(p.supplierId || '');
    setInvoiceNumber(p.invoiceNumber || '');
    setPurchaseOrderId(p.purchaseOrderId || null);
    setInitialPaidAmount(p.paidAmount || 0);
    setNotes(p.notes || '');
    if (Array.isArray(p.items) && p.items.length > 0) {
      setItems(
        p.items.map((i: any) => ({
          medicineId: i.medicineId,
          batchNumber: i.batchNumber || i.batch?.batchNumber || '',
          mfgDate: i.mfgDate ? new Date(i.mfgDate).toISOString().slice(0, 10) : '',
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().slice(0, 10) : '',
          qty: i.qty || 1,
          unitLevel: i.unitLevel || 'BOX',
          purchasePrice: i.purchasePrice || 0,
          sellingPrice: i.sellingPrice || 0,
          mrp: i.mrp || 0,
          taxPercent: i.taxPercent || 0,
        }))
      );
    }
    setShowCreateModal(true);
  };

  const handleDelete = (p: any) => {
    if (confirm('Are you sure you want to delete purchase invoice #' + p.invoiceNumber + '?')) {
      deletePurchaseMutation.mutate(p.id);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'medicineId') {
      const selectedMed = medicines.find((m: any) => m.id === value);
      if (selectedMed) {
        updated[index].purchasePrice = selectedMed.defaultPurchasePrice || selectedMed.mrp * 0.7 || 0;
        updated[index].sellingPrice = selectedMed.defaultSellingPrice || selectedMed.mrp * 0.9 || 0;
        updated[index].mrp = selectedMed.mrp || 0;
        updated[index].taxPercent = selectedMed.taxPercent || 12;
      }
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: '',
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        qty: 1,
        unitLevel: 'BOX',
        purchasePrice: 0,
        sellingPrice: 0,
        mrp: 0,
        taxPercent: 12,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i: number) => i !== index));
  };

  const handlePrintLabels = () => {
    const printArea = document.getElementById('label-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const isThermal = barcodeLayout === 'THERMAL';
    const isA4_24 = barcodeLayout === 'A4_24';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels - ${barcodeLayout}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${isThermal ? '50mm 25mm' : 'A4 portrait'};
              margin: ${isThermal ? '1mm' : '5mm 4mm 5mm 4mm'};
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0;
              padding: 0;
            }
            .print-grid {
              display: grid !important;
              grid-template-columns: ${isThermal ? '1fr' : 'repeat(3, 1fr)'} !important;
              gap: ${isThermal ? '2mm' : isA4_24 ? '3.5mm' : '2mm'} !important;
              width: 100% !important;
            }
            .print-label-card {
              border: 1px solid #111111 !important;
              border-radius: 4px !important;
              padding: 4px 6px !important;
              box-sizing: border-box !important;
              height: ${isThermal ? '24mm' : isA4_24 ? '33mm' : '26mm'} !important;
              max-height: ${isThermal ? '24mm' : isA4_24 ? '33mm' : '26mm'} !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              ${isThermal ? 'page-break-after: always; break-after: page;' : ''}
              overflow: hidden !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .print-label-card * {
              color: #000000 !important;
              background: transparent !important;
            }
            svg {
              max-width: 100% !important;
              height: ${isThermal ? '18px' : isA4_24 ? '26px' : '20px'} !important;
              display: block !important;
              margin: 0 auto !important;
            }
          </style>
        </head>
        <body>
          <div class="print-grid">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  };

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, amount, paymentMode }: { id: string; amount: number; paymentMode: PaymentMode }) => {
      return apiClient.post('/purchases/' + id + '/payments', { amount, paymentMode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      setPaymentModal(null);
      alert('Payment recorded successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      accessor: (p) => (
        <span className="font-mono font-bold text-accent">
          {p.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      accessor: (p) => (
        <span className="font-mono text-text-secondary text-xs">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier Agency',
      accessor: (p) => (
        <span className="font-medium text-text-primary">
          {p.supplier?.name || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Inward Status',
      render: (p) => {
        const isConfirmed = p.status === 'CONFIRMED' || p.status === 'APPROVED';
        return (
          <Badge
            variant={isConfirmed ? 'success' : 'warning'}
            size="sm"
            icon={isConfirmed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          >
            {p.status}
          </Badge>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Total Bill',
      align: 'right',
      accessor: (p) => (
        <span className="font-mono font-bold text-text-primary">
          {formatCurrency(Number(p.totalAmount || 0))}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      align: 'right',
      render: (p) => {
        const paid = p.paidAmount !== undefined
          ? Number(p.paidAmount)
          : p.payments ? p.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0;
        return (
          <span className="font-mono font-semibold text-status-success">
            {formatCurrency(paid)}
          </span>
        );
      },
    },
    {
      key: 'balanceDue',
      header: 'Balance Due',
      align: 'right',
      render: (p) => {
        const total = Number(p.totalAmount || 0);
        const paid = p.paidAmount !== undefined
          ? Number(p.paidAmount)
          : p.payments ? p.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0;
        const bal = p.balanceDue !== undefined ? Number(p.balanceDue) : Math.max(0, total - paid);
        return (
          <span className="font-mono font-bold text-status-error">
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      align: 'center',
      render: (p) => {
        const total = Number(p.totalAmount || 0);
        const paid = p.paidAmount !== undefined
          ? Number(p.paidAmount)
          : p.payments ? p.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0;
        const bal = p.balanceDue !== undefined ? Number(p.balanceDue) : Math.max(0, total - paid);
        const isPaid = paid >= total && total > 0;
        const isPartial = paid > 0 && paid < total;

        if (isPaid) {
          return (
            <Badge variant="success" size="sm" dot>
              PAID (₹{paid.toLocaleString('en-IN')})
            </Badge>
          );
        }
        if (isPartial) {
          return (
            <Badge variant="warning" size="sm" dot>
              PARTIAL (Due: ₹{bal.toLocaleString('en-IN')})
            </Badge>
          );
        }
        return (
          <Badge variant="error" size="sm" dot>
            UNPAID (Due: ₹{total.toLocaleString('en-IN')})
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions / Labels',
      align: 'center',
      render: (p) => {
        const total = Number(p.totalAmount || 0);
        const paid = p.paidAmount !== undefined
          ? Number(p.paidAmount)
          : p.payments ? p.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0;
        const bal = p.balanceDue !== undefined ? Number(p.balanceDue) : Math.max(0, total - paid);

        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBarcodeModal(p)}
              title="Print A4 / Thermal Barcode Shelf Labels"
              className="text-accent border-border"
              leftIcon={<Barcode className="w-3.5 h-3.5" />}
            >
              <span className="hidden sm:inline">Labels</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPaymentModal(p);
                setPaymentAmount(bal > 0 ? bal : total);
              }}
              title="Record Payment"
              className="text-status-success border-border"
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              <span className="hidden sm:inline">Pay</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(p)}
              title="Edit Purchase"
              className="w-7 h-7 p-0 text-text-secondary hover:text-accent"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(p)}
              title="Delete Purchase"
              className="w-7 h-7 p-0 text-status-error hover:bg-status-error-bg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
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
            title="Purchase Invoices & Inward Stock"
            description="Manage supplier inward stock, verify batches, and track payable invoices."
            actions={
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Purchase Inward (Stock In)
              </Button>
            }
          />

          {/* Search Bar */}
          <Card elevation="flat" className="p-3">
            <SmartAutocomplete
              placeholder="Search purchases by invoice #, supplier agency name, mobile, GST... (First char instant)"
              value={search}
              onChange={(val) => setSearch(val)}
              onClear={() => setSearch('')}
              fetchResults={async (q, signal) => {
                const res = await apiClient.get('/search/universal', {
                  params: { q, branchId: selectedBranchId || undefined, limit: 12 },
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

          {/* Purchases Table */}
          <DataTable
            columns={columns}
            data={purchases}
            isLoading={isLoading}
            emptyTitle="No purchase bills recorded"
            emptyDescription="There are no purchase records matching your criteria."
            compact
          />
        </main>

        {/* Create / Edit Purchase Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            size="xl"
            title={
              <div className="flex items-center gap-2 text-accent">
                <Truck className="w-5 h-5" />
                <span>{editingPurchase ? 'Edit Purchase Inward Entry' : 'New Purchase Inward Entry'}</span>
              </div>
            }
            description="Enter purchase inward bill, suppliers, batch details, and pricing."
          >
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Supplier Agency *"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  options={[
                    { label: 'Select Supplier...', value: '' },
                    ...suppliers.map((s: any) => ({
                      label: `${s.name} (${s.phone || 'No phone'})`,
                      value: s.id,
                    })),
                  ]}
                />

                <Input
                  label="Supplier Invoice #"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-98124"
                />

                <Input
                  label="Inward Notes / PO Ref"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Stock from central warehouse"
                />
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary text-xs">Inward Batch Line Items:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItemRow}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Medicine Row
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface-raised rounded-lg border border-border grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] text-text-muted block mb-0.5">Medicine *</label>
                        <select
                          required
                          value={item.medicineId}
                          onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
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
                        <label className="text-[10px] text-text-muted block mb-0.5">Batch #</label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          placeholder="Auto if blank"
                          onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-text-muted block mb-0.5">Expiry Date</label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-[10px] text-text-muted block mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-center text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-[10px] text-text-muted block mb-0.5">Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) => handleItemChange(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-[10px] text-text-muted block mb-0.5">MRP (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.mrp}
                          onChange={(e) => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-surface-base border border-border rounded-md text-xs font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-[10px] text-text-muted block mb-0.5">Tax %</label>
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(e) => handleItemChange(idx, 'taxPercent', parseFloat(e.target.value) || 0)}
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

              {/* Initial Payment Options */}
              <Card elevation="flat" className="p-3 space-y-3 bg-surface-raised">
                <span className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Initial Inward Payment (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Paid Amount Upfront (₹)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialPaidAmount}
                    onChange={(e) => setInitialPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />

                  <Select
                    label="Payment Mode"
                    value={initialPaymentMode}
                    onChange={(e: any) => setInitialPaymentMode(e.target.value)}
                    options={[
                      { label: 'Bank Transfer (NEFT/RTGS)', value: PaymentMode.BANK_TRANSFER },
                      { label: 'UPI / QR Code', value: PaymentMode.UPI },
                      { label: 'Cash', value: PaymentMode.CASH },
                      { label: 'Credit / Debit Card', value: PaymentMode.CARD },
                      { label: 'Cheque', value: PaymentMode.CHEQUE },
                    ]}
                  />
                </div>
              </Card>

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
                  variant="outline"
                  type="button"
                  disabled={createPurchaseMutation.isPending}
                  onClick={() => createPurchaseMutation.mutate(true)}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  disabled={createPurchaseMutation.isPending}
                  onClick={() => createPurchaseMutation.mutate(false)}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {createPurchaseMutation.isPending ? 'Inwarding...' : 'Confirm & Inward Stock'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Barcode Shelf Labels Generator Modal */}
        {barcodeModal && (() => {
          const rawItems = Array.isArray(barcodeModal.items) ? barcodeModal.items : [];
          const labelList: any[] = [];

          rawItems.forEach((it: any) => {
            const medName = it.medicine?.name || it.medicineName || 'Medicine Item';
            const bNum = it.batchNumber || it.batch?.batchNumber || 'BT-001';
            const exp = it.expiryDate ? formatDate(it.expiryDate) : 'N/A';
            const mrpVal = it.mrp || (it.sellingPrice ? it.sellingPrice * 1.1 : 0);
            const sellVal = it.sellingPrice || it.mrp || 0;
            const barcodeVal = it.medicine?.barcode || it.barcode || bNum;

            let count = 1;
            if (barcodeQtyMode === 'BATCH_QTY') {
              count = Math.max(1, Math.min(Number(it.qty || 1), 100));
            } else if (barcodeQtyMode === 'CUSTOM') {
              count = Math.max(1, Math.min(customLabelCount, 100));
            } else {
              count = barcodeLayout === 'A4_24' ? 24 : 30;
            }

            for (let i = 0; i < count; i++) {
              labelList.push({
                medName,
                bNum,
                exp,
                mrpVal,
                sellVal,
                barcodeVal,
              });
            }
          });

          return (
            <Modal
              isOpen={Boolean(barcodeModal)}
              onClose={() => setBarcodeModal(null)}
              size="xl"
              title={
                <div className="flex items-center gap-2 text-accent">
                  <Barcode className="w-5 h-5" />
                  <span>Print Barcode Shelf Labels — Invoice #{barcodeModal.invoiceNumber}</span>
                </div>
              }
              description="Configure barcode sticker format, quantity rules, and print to sticker sheets or thermal roll."
            >
              <div className="space-y-4 pt-2">
                {/* Configuration Bar */}
                <div className="p-3 bg-surface-raised rounded-xl border border-border flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Sticker Sheet Layout
                      </label>
                      <select
                        value={barcodeLayout}
                        onChange={(e: any) => setBarcodeLayout(e.target.value)}
                        className="px-2.5 py-1.5 bg-surface-base border border-border rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="A4_30">A4 Sheet — 30 Labels (3 × 10 Grid)</option>
                        <option value="A4_24">A4 Sheet — 24 Labels (3 × 8 Grid)</option>
                        <option value="THERMAL">Direct Thermal Roll (50mm × 25mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                        Quantity Generation Rule
                      </label>
                      <select
                        value={barcodeQtyMode}
                        onChange={(e: any) => setBarcodeQtyMode(e.target.value)}
                        className="px-2.5 py-1.5 bg-surface-base border border-border rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="FILL_PAGE">Full Sheet (Fill standard page)</option>
                        <option value="BATCH_QTY">Match Inward Qty (1 sticker per unit)</option>
                        <option value="CUSTOM">Custom Sticker Count</option>
                      </select>
                    </div>

                    {barcodeQtyMode === 'CUSTOM' && (
                      <div>
                        <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                          Count Per Item
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={customLabelCount}
                          onChange={(e) => setCustomLabelCount(parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1.5 bg-surface-base border border-border rounded-lg text-xs font-mono text-center text-text-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm" className="font-mono">
                      {labelList.length} Stickers
                    </Badge>
                    <Button
                      variant="primary"
                      onClick={handlePrintLabels}
                      leftIcon={<Printer className="w-3.5 h-3.5" />}
                    >
                      Print Stickers
                    </Button>
                  </div>
                </div>

                {/* Live Preview Container */}
                <div className="bg-surface-raised p-4 rounded-xl border border-border max-h-[50vh] overflow-y-auto">
                  <div
                    id="label-print-area"
                    ref={labelPrintRef}
                    className={`grid gap-2 bg-white text-black p-3 rounded-lg border border-border ${
                      barcodeLayout === 'THERMAL' ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-3'
                    }`}
                  >
                    {labelList.map((lbl: any, idx: number) => (
                      <div
                        key={idx}
                        className="print-label-card border border-neutral-800 rounded p-1.5 flex flex-col justify-between bg-white text-black h-24 text-[10px] overflow-hidden"
                      >
                        <div className="flex justify-between items-start leading-tight">
                          <span className="font-bold truncate max-w-[130px]">{lbl.medName}</span>
                          <span className="font-mono font-semibold text-[9px]">₹{Number(lbl.sellVal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-600 font-mono">
                          <span>B:{lbl.bNum}</span>
                          <span>EXP:{lbl.exp}</span>
                        </div>
                        <div className="flex justify-center my-0.5">
                          <ReactBarcode
                            value={lbl.barcodeVal || lbl.bNum || '000000'}
                            width={1.1}
                            height={20}
                            fontSize={8}
                            margin={0}
                            displayValue={true}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* Record Payment Modal */}
        {paymentModal && (() => {
          const totalAmount = Number(paymentModal.totalAmount || 0);
          const paidAmount = paymentModal.paidAmount !== undefined
            ? Number(paymentModal.paidAmount)
            : paymentModal.payments ? paymentModal.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0;
          const balanceDue = paymentModal.balanceDue !== undefined
            ? Number(paymentModal.balanceDue)
            : Math.max(0, totalAmount - paidAmount);

          return (
            <Modal
              isOpen={Boolean(paymentModal)}
              onClose={() => setPaymentModal(null)}
              title={
                <div className="flex items-center gap-2 text-status-success">
                  <CreditCard className="w-5 h-5" />
                  <span>Record Supplier Payment — Invoice #{paymentModal.invoiceNumber}</span>
                </div>
              }
              description={`Payable to supplier: ${paymentModal.supplier?.name || 'Supplier Agency'}`}
            >
              <div className="space-y-4 pt-2">
                <Card elevation="flat" className="p-3 space-y-2 bg-surface-raised">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Supplier Agency:</span>
                    <span className="font-semibold text-text-primary">{paymentModal.supplier?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Total Bill Amount:</span>
                    <span className="font-bold font-mono text-text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-status-success font-medium">Already Paid:</span>
                    <span className="font-bold font-mono text-status-success">
                      {formatCurrency(paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border">
                    <span className="text-status-error font-bold">Remaining Balance Due:</span>
                    <span className="font-extrabold font-mono text-sm text-status-error">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </Card>

                <Input
                  label="Payment Amount (₹) *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e: any) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  helperText={`Enter partial amount or full remaining balance (₹${balanceDue.toLocaleString('en-IN')}).`}
                />

                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e: any) => setPaymentMode(e.target.value)}
                  options={[
                    { label: 'Bank Transfer (NEFT/RTGS/IMPS)', value: PaymentMode.BANK_TRANSFER },
                    { label: 'UPI / QR Code', value: PaymentMode.UPI },
                    { label: 'Cash', value: PaymentMode.CASH },
                    { label: 'Credit / Debit Card', value: PaymentMode.CARD },
                    { label: 'Cheque', value: PaymentMode.CHEQUE },
                  ]}
                />

                <div className="pt-3 border-t border-border flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setPaymentModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="bg-status-success hover:opacity-90"
                    disabled={recordPaymentMutation.isPending}
                    onClick={() =>
                      recordPaymentMutation.mutate({
                        id: paymentModal.id,
                        amount: paymentAmount,
                        paymentMode,
                      })
                    }
                  >
                    {recordPaymentMutation.isPending
                      ? 'Recording...'
                      : `Confirm Payment (₹${paymentAmount.toLocaleString('en-IN')})`}
                  </Button>
                </div>
              </div>
            </Modal>
          );
        })()}
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-surface-page text-accent">
          Loading Purchases...
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
