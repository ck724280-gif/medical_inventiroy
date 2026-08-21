'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Barcode,
  Printer,
} from 'lucide-react';
import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
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
          taxPercent: Number(item.taxPercent || 12),
        })),
      };

      if (editingPurchase) {
        return apiClient.patch('/purchases/' + editingPurchase.id, payload);
      }
      return apiClient.post(isDraft ? '/purchases?draft=true' : '/purchases', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      setShowCreateModal(false);
      const isEdit = Boolean(editingPurchase);
      setEditingPurchase(null);
      if (!isEdit && res?.data) {
        setBarcodeModal(res.data?.data || res.data);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save purchase entry.');
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete('/purchases/' + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      alert('Purchase entry deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete purchase entry.');
    },
  });

  const handleOpenCreate = () => {
    setEditingPurchase(null);
    setSupplierId('');
    setInvoiceNumber('');
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

  const handleOpenEdit = async (p: any) => {
    try {
      const res = await apiClient.get('/purchases/' + p.id);
      const full = res.data?.data || res.data;
      setEditingPurchase(full);
      setSupplierId(full.supplierId || '');
      setInvoiceNumber(full.invoiceNumber || '');
      setNotes(full.notes || '');
      if (Array.isArray(full.items) && full.items.length > 0) {
        setItems(
          full.items.map((i: any) => ({
            medicineId: i.medicineId,
            batchNumber: i.batchNumber || '',
            mfgDate: i.mfgDate ? i.mfgDate.split('T')[0] : '',
            expiryDate: i.expiryDate ? i.expiryDate.split('T')[0] : '',
            qty: i.qty || 1,
            unitLevel: i.unitLevel || 'BOX',
            purchasePrice: i.purchasePrice || 0,
            sellingPrice: i.sellingPrice || 0,
            mrp: i.mrp || 0,
            taxPercent: i.taxPercent || 12,
          }))
        );
      }
      setShowCreateModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load purchase details');
    }
  };

  const handleDelete = (p: any) => {
    if (confirm('Are you sure you want to delete purchase invoice #' + p.invoiceNumber + '?')) {
      deletePurchaseMutation.mutate(p.id);
    }
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
    window.print();
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090d16] overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Purchase Invoices &amp; Inward Stock
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage supplier inward stock, verify batches, and track payable invoices.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Purchase Inward (Stock In)
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search purchases by invoice #, supplier agency name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
            />
          </div>

          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier Agency</th>
                    <th className="py-3 px-4">Inward Status</th>
                    <th className="py-3 px-4 text-right">Total Bill</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-center">Actions / Labels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading purchase entries...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No purchase bills recorded.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p: any) => {
                      const totalAmount = Number(p.totalAmount || 0);
                      const paidAmount = p.paidAmount !== undefined ? Number(p.paidAmount) : (p.payments ? p.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0);
                      const balanceDue = p.balanceDue !== undefined ? Number(p.balanceDue) : Math.max(0, totalAmount - paidAmount);
                      const isPaid = paidAmount >= totalAmount && totalAmount > 0;
                      const isPartial = paidAmount > 0 && paidAmount < totalAmount;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold font-mono text-sky-600 dark:text-sky-400">{p.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">{formatDate(p.createdAt)}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{p.supplier?.name || '-'}</td>
                          <td className="py-3 px-4">
                            <span
                              className={'px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ' + (
                                p.status === 'CONFIRMED' || p.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              )}
                            >
                              {p.status === 'CONFIRMED' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              )}
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paidAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(balanceDue)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                PAID (₹{paidAmount.toLocaleString('en-IN')})
                              </span>
                            ) : isPartial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                PARTIAL (Due: ₹{balanceDue.toLocaleString('en-IN')})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                UNPAID (Due: ₹{totalAmount.toLocaleString('en-IN')})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setBarcodeModal(p)}
                                title="Print A4 / Thermal Barcode Shelf Labels"
                                className="p-1.5 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-sky-200 dark:border-slate-700 transition"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Labels</span>
                              </button>
                              <button
                                onClick={() => {
                                  setPaymentModal(p);
                                  setPaymentAmount(balanceDue > 0 ? balanceDue : totalAmount);
                                }}
                                title="Record Payment"
                                className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-emerald-200 dark:border-slate-700 transition"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Pay</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Purchase"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                title="Delete Purchase"
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingPurchase ? 'Edit Purchase Inward Entry' : 'New Purchase Inward Entry'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Supplier Agency *
                    </label>
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
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Supplier Invoice / Bill No
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Auto-generated if blank (e.g. INV-9842)"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notes / PO Reference
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Inward from PO #PO-2026-001"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Inward Line Items &amp; Batches:
                    </span>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medicine Line
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-3">
                          <label className="text-[10px] text-slate-500 block">Medicine</label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => {
                              const med = medicines.find((m: any) => m.id === e.target.value);
                              const updated = [...items];
                              updated[idx].medicineId = e.target.value;
                              if (med) {
                                updated[idx].mrp = med.mrp || 0;
                                updated[idx].sellingPrice = med.defaultSellingPrice || 0;
                                updated[idx].taxPercent = med.taxPercent || 12;
                              }
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-xs focus:outline-none focus:border-sky-500"
                          >
                            <option value="">Select Medicine...</option>
                            {medicines.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Batch No *</label>
                          <input
                            type="text"
                            placeholder="e.g. BT-9021"
                            value={item.batchNumber}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].batchNumber = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-mono text-xs uppercase focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Expiry Date *</label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].expiryDate = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">Qty</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.qty === 0 ? '' : item.qty}
                            onFocus={(e: any) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].qty = e.target.value === '' ? 0 : parseInt(e.target.value) || 1;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-mono text-xs text-center focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Purchase Cost (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={item.purchasePrice === 0 ? '' : item.purchasePrice}
                            onFocus={(e: any) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].purchasePrice =
                                e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-mono text-xs text-right focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">MRP (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={item.mrp === 0 ? '' : item.mrp}
                            onFocus={(e: any) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].mrp = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-mono text-xs text-right focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="col-span-1 text-center pt-3">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseMutation.mutate(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseMutation.mutate(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow"
                  >
                    Confirm &amp; Update Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}        {barcodeModal && (() => {
          const rawItems = barcodeModal?.items || [];
          let printStickers: any[] = [];
          if (barcodeQtyMode === 'BATCH_QTY') {
            rawItems.forEach((item: any) => {
              const count = Math.max(1, Number(item.qty || 1));
              for (let k = 0; k < count; k++) {
                printStickers.push(item);
              }
            });
          } else if (barcodeQtyMode === 'FILL_PAGE') {
            const targetCount = barcodeLayout === 'A4_24' ? 24 : 30;
            if (rawItems.length > 0) {
              for (let k = 0; k < targetCount; k++) {
                printStickers.push(rawItems[k % rawItems.length]);
              }
            }
          } else {
            const targetCount = Math.max(1, Number(customLabelCount || 1));
            if (rawItems.length > 0) {
              for (let k = 0; k < targetCount; k++) {
                printStickers.push(rawItems[k % rawItems.length]);
              }
            }
          }

          const gridClass =
            barcodeLayout === 'A4_30'
              ? 'print-grid-a4-30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5'
              : barcodeLayout === 'A4_24'
              ? 'print-grid-a4-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5'
              : 'print-grid-thermal grid grid-cols-1 gap-2';

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print-modal-container">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 space-y-4 text-xs print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Barcode Shelf Labels Generator &amp; A4 Print Engine
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Invoice #{barcodeModal.invoiceNumber} | Received {rawItems.length} Batch item(s)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBarcodeModal(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Print Customization Controls (Hidden in Print) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 print:hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        1. Sheet Format / Printer Type
                      </label>
                      <select
                        value={barcodeLayout}
                        onChange={(e: any) => setBarcodeLayout(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                      >
                        <option value="A4_30">A4 Sheet (30 Labels - 3x10 Grid)</option>
                        <option value="A4_24">A4 Sheet (24 Labels - 3x8 Grid)</option>
                        <option value="THERMAL">Thermal Roll (50x25mm / 40x20mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        2. Label Quantity Mode
                      </label>
                      <select
                        value={barcodeQtyMode}
                        onChange={(e: any) => setBarcodeQtyMode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                      >
                        <option value="FILL_PAGE">Fill Complete A4 Page ({barcodeLayout === 'A4_24' ? 24 : 30} Stickers)</option>
                        <option value="BATCH_QTY">Match Inward Batch Stock Count</option>
                        <option value="CUSTOM">Custom Number of Stickers</option>
                      </select>
                    </div>

                    {barcodeQtyMode === 'CUSTOM' && (
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Exact Sticker Count
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={customLabelCount}
                          onChange={(e: any) => setCustomLabelCount(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                    <span>Generating <strong>{printStickers.length}</strong> barcode sticker(s). All medicine, batch, expiry, and MRP information is encoded.</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Compatible with all 1D laser &amp; optical POS scanners</span>
                  </div>
                </div>

                <div
                  ref={labelPrintRef}
                  className="space-y-3 max-h-[50vh] overflow-y-auto p-3 bg-slate-50 dark:bg-[#090d16] rounded-xl border border-slate-200 dark:border-slate-800 print:p-0 print:border-none print:bg-white print:max-h-none print:overflow-visible"
                >
                  {/* Print Stylesheet Overrides */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 8mm 6mm 8mm 6mm;
                      }
                      body * {
                        visibility: hidden !important;
                      }
                      #label-print-area, #label-print-area * {
                        visibility: visible !important;
                      }
                      #label-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: grid !important;
                      }
                      .print-grid-a4-30 {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 2.5mm !important;
                      }
                      .print-grid-a4-24 {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 3.5mm !important;
                      }
                      .print-grid-thermal {
                        grid-template-columns: 1fr !important;
                        gap: 2mm !important;
                      }
                      .print-label-card {
                        background: #ffffff !important;
                        color: #000000 !important;
                        border: 1px solid #111111 !important;
                        border-radius: 4px !important;
                        padding: 4px 6px !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        height: 86px !important;
                      }
                      .print-label-card * {
                        color: #000000 !important;
                        background: transparent !important;
                      }
                    }
                  `}} />

                  <div id="label-print-area" className={gridClass}>
                    {printStickers.map((item: any, idx: number) => {
                      const medicine =
                        medicines.find((m: any) => m.id === item.medicineId) || item.medicine;
                      const barcodeVal = medicine?.barcodes?.[0]?.barcodeValue || medicine?.barcode || medicine?.sku || item.batchNumber || 'N/A';
                      const composition = medicine?.genericName || medicine?.composition || '';

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 rounded-lg flex flex-col justify-between text-center print-label-card shadow-sm"
                          style={{ minHeight: '86px' }}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate text-left w-full">
                                {medicine?.name || 'MEDICINE'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 font-mono shrink-0">
                                {medicine?.dosageForm || 'TAB'}
                              </span>
                            </div>
                            {composition && (
                              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 truncate text-left mt-0.5">
                                {composition}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[9px] text-slate-600 dark:text-slate-400 font-mono font-semibold mt-0.5 border-t border-slate-100 dark:border-slate-800/80 pt-0.5">
                              <span>B.No: {item.batchNumber}</span>
                              <span>
                                EXP: {item.expiryDate ? formatDate(item.expiryDate, 'MM/yyyy') : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Graphical Barcode component */}
                          <div className="my-0.5 flex items-center justify-center overflow-hidden bg-white p-0.5 rounded">
                            {barcodeVal !== 'N/A' ? (
                              <ReactBarcode
                                value={barcodeVal}
                                width={1.1}
                                height={26}
                                fontSize={8}
                                margin={0}
                                displayValue={false}
                              />
                            ) : (
                              <span className="text-[9px] text-slate-400">NO BARCODE</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-0.5">
                            <span className="text-slate-600 dark:text-slate-400">MRP: {formatCurrency(item.mrp || 0)}</span>
                            <span className="font-mono text-[8.5px] text-slate-500">{barcodeVal}</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                              OUR: {formatCurrency(item.sellingPrice || item.mrp || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 print:hidden">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Total Stickers Ready: <strong className="text-slate-900 dark:text-white">{printStickers.length}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBarcodeModal(null)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-800 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintLabels}
                      className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/20 transition active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      Print Labels ({barcodeLayout === 'THERMAL' ? 'Roll' : 'A4 Sheet'})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {paymentModal && (() => {
          const totalAmount = Number(paymentModal.totalAmount || 0);
          const paidAmount = paymentModal.paidAmount !== undefined ? Number(paymentModal.paidAmount) : (paymentModal.payments ? paymentModal.payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0) : 0);
          const balanceDue = paymentModal.balanceDue !== undefined ? Number(paymentModal.balanceDue) : Math.max(0, totalAmount - paidAmount);

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 text-xs text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Record Supplier Bill Payment
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Invoice #{paymentModal.invoiceNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentModal(null)}
                    className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Supplier:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{paymentModal.supplier?.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Bill Amount:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Already Paid:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-red-600 dark:text-red-400 font-bold">Remaining Balance Due:</span>
                      <span className="font-extrabold font-mono text-sm text-red-600 dark:text-red-400">
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e: any) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter partial amount (e.g. ₹20,000) or full remaining balance (₹{balanceDue.toLocaleString('en-IN')}).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e: any) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value={PaymentMode.UPI}>UPI / QR Code</option>
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.CARD}>Credit / Debit Card</option>
                      <option value={PaymentMode.CHEQUE}>Cheque</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentModal(null)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        recordPaymentMutation.mutate({
                          id: paymentModal.id,
                          amount: paymentAmount,
                          paymentMode,
                        })
                      }
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                    >
                      Confirm Payment (₹{paymentAmount.toLocaleString('en-IN')})
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
        <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] text-sky-600">
          Loading Purchases...
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
