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
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-100/80 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier Agency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Actions / Labels</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Loading purchase entries...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No purchase bills recorded.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p: any) => (
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
                          {formatCurrency(p.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setBarcodeModal(p)}
                              title="Print 40x20mm Barcode Shelf Labels"
                              className="p-1.5 bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-sky-200 dark:border-slate-700 transition"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Labels</span>
                            </button>
                            <button
                              onClick={() => {
                                setPaymentModal(p);
                                setPaymentAmount(p.totalAmount || 0);
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
                    ))
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
        )}

        {barcodeModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 text-xs print:shadow-none print:border-none print:w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Print Thermal Shelf Barcode Labels (40mm x 20mm)
                  </h3>
                </div>
                <button
                  onClick={() => setBarcodeModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={labelPrintRef}
                className="space-y-3 max-h-96 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 print:p-0 print:border-none print:bg-white"
              >
                <p className="text-[11px] text-slate-500 print:hidden">
                  Preview of standard 40x20mm thermal shelf labels for received batches:
                </p>
                <div className="grid grid-cols-2 gap-3 print:grid-cols-1 print:gap-1">
                  {(barcodeModal?.items || []).map((item: any, idx: number) => {
                    const medicine =
                      medicines.find((m: any) => m.id === item.medicineId) || item.medicine;
                    const barcode = medicine?.barcodes?.[0]?.barcodeValue || medicine?.sku || 'N/A';
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center print:border print:border-black print:p-2 print:m-1"
                        style={{ minHeight: '120px' }}
                      >
                        <span className="font-bold text-[11px] text-slate-900 truncate w-full">
                          {medicine?.name || 'MEDICINE'}
                        </span>
                        <div className="flex items-center justify-between w-full text-[9px] text-slate-500 mt-0.5">
                          <span>B: {item.batchNumber}</span>
                          <span>
                            EXP: {item.expiryDate ? formatDate(item.expiryDate, 'MM/yy') : '-'}
                          </span>
                        </div>
                        <div className="font-mono text-base font-black tracking-widest my-1 text-slate-900">
                          *{barcode}*
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-900">
                          <span>MRP: {formatCurrency(item.mrp || 0)}</span>
                          <span className="text-emerald-700 font-extrabold">
                            OUR: {formatCurrency(item.sellingPrice || item.mrp || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 print:hidden">
                <button
                  type="button"
                  onClick={() => setBarcodeModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintLabels}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Print 40x20mm Labels
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 text-xs text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Record Supplier Bill Payment
                  </h3>
                </div>
                <button
                  onClick={() => setPaymentModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice:</span>
                    <span className="font-mono font-bold text-sky-600">
                      {paymentModal.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold">{paymentModal.supplier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Invoice Amount:</span>
                    <span className="font-bold font-mono">
                      {formatCurrency(paymentModal.totalAmount || 0)}
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
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
                    <option value={PaymentMode.UPI}>UPI / QR</option>
                    <option value={PaymentMode.CASH}>Cash</option>
                    <option value={PaymentMode.CARD}>Card / POS</option>
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
