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
  X,
  CreditCard,
  Barcode,
  Printer,
  Layers,
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
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Supplier & Item inputs for new purchase entry
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
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

  // Payment Recording Modal
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.BANK_TRANSFER);

  // Barcode Label Printing Modal (R6)
  const [barcodeModal, setBarcodeModal] = useState<any | null>(null);
  const labelPrintRef = useRef<HTMLDivElement>(null);

  // Check if navigating from PO conversion
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
          // ignore parsing error
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
        branchId: selectedBranchId,
        isDraft,
        notes,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          mfgDate: item.mfgDate ? new Date(item.mfgDate).toISOString() : new Date().toISOString(),
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
          qty: Number(item.qty),
          unitLevel: item.unitLevel || 'BOX',
          purchasePrice: Number(item.purchasePrice),
          sellingPrice: Number(item.sellingPrice),
          mrp: Number(item.mrp),
          taxPercent: Number(item.taxPercent || 12),
        })),
      };

      return apiClient.post('/purchases', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      setShowCreateModal(false);
      // Offer barcode printing after saving purchase
      if (res?.data) {
        setBarcodeModal(res.data?.data || res.data);
      }
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/purchases/${paymentModal.id}/payments`, {
        amount: paymentAmount,
        paymentMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      setPaymentModal(null);
    },
  });

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
    setItems(items.filter((_, i) => i !== index));
  };

  const handlePrintLabels = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex h-screen bg-obsidian-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Invoices & Inward Stock</h2>
              <p className="text-xs text-slate-500">
                Manage supplier inward shipments, batch tracking, barcode shelf label printing, and payments.
              </p>
            </div>

            <button
              onClick={() => {
                setSupplierId('');
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
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Purchase Entry
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Purchase Invoice # or Supplier..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier Agency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Labels / Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading purchase entries...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No purchase bills recorded.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900">{p.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(p.createdAt)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.supplier?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md font-medium text-[10px] inline-flex items-center gap-1 ${
                              p.status === 'CONFIRMED' || p.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {p.status === 'CONFIRMED' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(p.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setBarcodeModal(p)}
                              title="Print 40x20mm Barcode Shelf Labels"
                              className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-sky-200 transition"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              Labels
                            </button>
                            <button
                              onClick={() => {
                                setPaymentModal(p);
                                setPaymentAmount(p.totalAmount || 0);
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-emerald-200 transition"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay
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

        {/* New Inward Purchase Bill Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-4 text-xs overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">New Purchase Inward Entry</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supplier Agency *</label>
                    <select
                      required
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
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
                    <label className="block font-semibold text-slate-700 mb-1">Notes / PO Reference</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Inward from PO #PO-2026-001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Items Entry Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Inward Line Items & Batches:</span>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medicine Line
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
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
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
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
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs uppercase"
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
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].qty = parseInt(e.target.value) || 1;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-center"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-500 block">Purchase Cost (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.purchasePrice}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].purchasePrice = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-right"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-[10px] text-slate-500 block">MRP (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.mrp}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].mrp = parseFloat(e.target.value) || 0;
                              setItems(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs text-right"
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

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
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
                    Confirm & Update Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Thermal Label Print Modal (R6) */}
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
                <button onClick={() => setBarcodeModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Printable Thermal Label Preview */}
              <div ref={labelPrintRef} className="space-y-3 max-h-96 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 print:p-0 print:border-none print:bg-white">
                <p className="text-[11px] text-slate-500 print:hidden">
                  Preview of standard 40x20mm thermal shelf labels for received batches:
                </p>
                <div className="grid grid-cols-2 gap-3 print:grid-cols-1 print:gap-1">
                  {(Array.isArray(barcodeModal.items) ? barcodeModal.items : []).map((item: any, i: number) => (
                    <div
                      key={i}
                      className="bg-white p-2.5 rounded-lg border-2 border-dashed border-slate-300 font-mono text-[10px] space-y-1 print:border-none print:m-0 print:p-1"
                      style={{ width: '40mm', minHeight: '20mm' }}
                    >
                      <div className="font-bold truncate text-[11px] text-slate-900">{item.medicine?.name || item.medicineName || 'Medicine'}</div>
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>B:{item.batchNumber || item.batch?.batchNumber || 'N/A'}</span>
                        <span>EXP:{formatDate(item.expiryDate, 'MM/YY')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 text-[10px]">
                        <span>MRP: ₹{item.mrp}</span>
                        <span>Qty: {item.qty}</span>
                      </div>
                      <div className="pt-0.5 text-center">
                        <div className="h-4 bg-slate-900 w-full flex items-center justify-center text-[7px] text-white tracking-widest">
                          |||| | ||||| || |||
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono">{item.batchNumber || '8901234567890'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setBarcodeModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintLabels}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Print 40x20mm Labels
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Payment Modal */}
        {paymentModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Record Supplier Payment</h3>
                <button onClick={() => setPaymentModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMode.UPI}>UPI</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Save Payment'}
                </button>
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
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading purchases...</div>}>
      <PurchasesContent />
    </Suspense>
  );
}
