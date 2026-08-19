'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ShoppingCart,
  Search,
  Barcode,
  Trash2,
  CheckCircle2,
  Printer,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  ShieldAlert,
  MessageCircle,
  X,
  Layers,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useCartStore } from '../../stores/cart-store';
import { PaymentMode, PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';
import { formatCurrency, generateWhatsAppInvoiceUrl } from '@medical-inventory/shared-utils';

export default function PosPage() {
  const { selectedBranchId } = useAuthStore();
  const cart = useCartStore();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [activePaymentMode, setActivePaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<ThermalReceiptDataDto | null>(null);
  const [savedInvoiceData, setSavedInvoiceData] = useState<any | null>(null);

  // Schedule H Prescription Modal State (R7)
  const [showRxModal, setShowRxModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    doctorName: '',
    doctorRegNo: '',
    patientName: '',
    patientAge: 30,
    patientAddress: '',
    prescriptionNumber: '',
    drugSchedule: 'SCHEDULE_H',
  });

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Quick Barcode Scanning Query
  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const res = await apiClient.post('/pos/scan', {
        barcode: barcodeInput.trim(),
        branchId: selectedBranchId,
      });

      const scanData = res.data?.data || res.data;
      if (scanData?.medicine) {
        cart.addItem({
          medicineId: scanData.medicine.id,
          name: scanData.medicine.name,
          sku: scanData.medicine.sku,
          qty: 1,
          rate: scanData.fefoBatch?.sellingPrice ?? scanData.medicine.defaultSellingPrice,
          mrp: scanData.fefoBatch?.mrp ?? scanData.medicine.mrp,
          batchId: scanData.fefoBatch?.batchId,
          batchNumber: scanData.fefoBatch?.batchNumber,
          expiryDate: scanData.fefoBatch?.expiryDate,
          taxPercent: scanData.medicine.taxPercent,
          discountPercent: 0,
          unit: scanData.medicine.baseUnit,
          prescriptionRequired: scanData.medicine.prescriptionRequired,
        });
        setBarcodeInput('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Barcode scan failed');
    }
  };

  // Medicine Search Dropdown Query
  const { data: searchResultsData } = useQuery({
    queryKey: ['pos-search-medicines', searchQuery, selectedBranchId],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const res = await apiClient.get('/medicines', {
        params: { search: searchQuery, limit: 10 },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: searchQuery.length >= 2,
  });

  const searchResults = Array.isArray(searchResultsData) ? searchResultsData : [];

  // Customer Party-Pricing Lookup
  useEffect(() => {
    if (customerMobile.length === 10) {
      apiClient
        .get('/customers', { params: { search: customerMobile } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          if (list.length > 0) {
            setCustomerName(list[0].name);
            setPrescriptionForm((prev) => ({ ...prev, patientName: list[0].name }));
          }
        })
        .catch(() => {});
    }
  }, [customerMobile]);

  const hasScheduleHDrug = cart.items.some(
    (i: any) => i.prescriptionRequired || (i.medicine && (i.medicine as any).drugSchedule !== 'OTC')
  );

  const executeCheckout = async (rxData?: any) => {
    if (cart.items.length === 0) return;
    if (!selectedBranchId) {
      alert('Please select an active branch');
      return;
    }

    setIsCheckingOut(true);
    try {
      const payload = {
        branchId: selectedBranchId,
        customerMobile: customerMobile || null,
        customerName: customerName || null,
        items: cart.items.map((item: any) => ({
          medicineId: item.medicineId,
          batchId: item.batchId || undefined,
          qty: item.qty,
          unitLevel: item.unitLevel || 'TABLET',
          rate: item.rate,
          discountPercent: item.discountPercent,
        })),
        payments: [
          {
            amount: cart.getGrandTotal(),
            paymentMode: activePaymentMode,
          },
        ],
        invoiceDiscountPercent: cart.invoiceDiscountPercent,
        paperWidth: cart.paperWidth,
        prescription: rxData || null,
      };

      const res = await apiClient.post('/pos/checkout', payload);
      const invoice = res.data?.data || res.data;
      setSavedInvoiceData(invoice);

      // Load receipt data for immediate preview
      if (invoice?.id) {
        const receiptRes = await apiClient.get(`/sales/${invoice.id}/receipt`, {
          params: { paperWidth: cart.paperWidth },
        });
        setCompletedReceiptData(receiptRes.data?.data || receiptRes.data);
      }

      cart.clearCart();
      setCustomerMobile('');
      setCustomerName('');
      setShowRxModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCheckoutClick = () => {
    if (hasScheduleHDrug) {
      setShowRxModal(true);
    } else {
      executeCheckout();
    }
  };

  const handleRxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCheckout(prescriptionForm);
  };

  const handleWhatsAppShare = () => {
    if (!savedInvoiceData) return;
    const phone = customerMobile || prompt('Enter customer WhatsApp mobile:');
    if (!phone) return;
    const url = generateWhatsAppInvoiceUrl(phone, savedInvoiceData.invoiceNumber, savedInvoiceData.totalAmount);
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* LEFT: Fast Item Entry & Bill Cart Area */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Top Scanning & Medicine Search Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-3">
              {/* Barcode Quick Scan */}
              <form onSubmit={handleBarcodeScan} className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Barcode className="w-4 h-4" />
                </div>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan EAN-13 Barcode or SKU (Press Enter)..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                />
              </form>

              {/* Medicine Autocomplete Search */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Medicine name or Generic molecule..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                />

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-11 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((med: any) => (
                      <div
                        key={med.id}
                        onClick={() => {
                          cart.addItem({
                            medicineId: med.id,
                            name: med.name,
                            sku: med.sku,
                            qty: 1,
                            unitLevel: 'TABLET',
                            rate: med.defaultSellingPrice,
                            mrp: med.mrp,
                            taxPercent: med.taxPercent,
                            discountPercent: 0,
                            unit: med.baseUnit?.abbreviation || 'PCS',
                            prescriptionRequired: med.prescriptionRequired || med.isScheduleH || med.isScheduleH1,
                          });
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-sky-50 cursor-pointer flex justify-between items-center transition"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900">{med.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {med.genericName} • MRP: ₹{med.mrp}
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-sky-700">
                          ₹{med.defaultSellingPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items Table */}
            <div className="flex-1 overflow-y-auto">
              {cart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
                  <ShoppingCart className="w-12 h-12 stroke-1 text-slate-300" />
                  <p className="text-sm font-semibold">Cart is currently empty</p>
                  <p className="text-xs text-slate-400">Scan barcode or search medicine to add to bill</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Medicine & Batch</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-center">Unit Level</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Array.isArray(cart.items) ? cart.items : []).map((item: any, idx: number) => (
                      <tr key={`${item.medicineId}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {item.name}
                            {item.prescriptionRequired && (
                              <span className="px-1.5 py-0.2 bg-red-100 text-red-700 font-mono text-[9px] rounded font-bold">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            B: {item.batchNumber || 'FEFO Auto'} {item.expiryDate && `• Exp: ${item.expiryDate}`}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                          ₹{Number(item.rate || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <select
                            value={item.unitLevel || 'TABLET'}
                            onChange={(e) => {
                              const updated = [...cart.items];
                              updated[idx].unitLevel = e.target.value;
                              cart.setItems(updated);
                            }}
                            className="px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded font-semibold text-[10px]"
                          >
                            <option value="BOX">Box</option>
                            <option value="STRIP">Strip</option>
                            <option value="TABLET">Tablet / Loose</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => cart.updateItemQty(item.medicineId, Math.max(1, item.qty - 1), item.batchId)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => cart.updateItemQty(item.medicineId, parseInt(e.target.value) || 1, item.batchId)}
                              className="w-10 text-center font-mono font-bold text-slate-900 border border-slate-300 rounded py-0.5"
                            />
                            <button
                              onClick={() => cart.updateItemQty(item.medicineId, item.qty + 1, item.batchId)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => cart.updateItemDiscount(item.medicineId, parseFloat(e.target.value) || 0, item.batchId)}
                            className="w-12 text-right border border-slate-300 rounded py-0.5 px-1 font-mono text-xs"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono text-sm">
                          ₹{Number(item.lineTotal || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => cart.removeItem(item.medicineId, item.batchId)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: Customer, Payment & Fast Checkout Panel */}
          <div className="w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-5 gap-4 justify-between">
            <div className="space-y-4">
              {/* Customer Quick Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Customer (Special Pricing Auto-Applied)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Mobile (10 digits)"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Customer / Patient"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: PaymentMode.CASH, label: 'Cash', icon: Banknote },
                    { mode: PaymentMode.UPI, label: 'UPI / QR', icon: Smartphone },
                    { mode: PaymentMode.CARD, label: 'Card', icon: CreditCard },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = activePaymentMode === p.mode;
                    return (
                      <button
                        key={p.mode}
                        type="button"
                        onClick={() => setActivePaymentMode(p.mode)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold gap-1 transition ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bill Summary & Checkout Button */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-medium">₹{cart.getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Discount Total:</span>
                <span className="font-mono text-emerald-600">-₹{cart.getDiscountTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Tax / GST:</span>
                <span className="font-mono font-medium">₹{cart.getTaxTotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-sm">TOTAL PAYABLE:</span>
                <span className="text-2xl font-extrabold text-sky-700 font-mono">
                  ₹{cart.getGrandTotal().toFixed(2)}
                </span>
              </div>

              {/* Checkout Action Button */}
              <button
                disabled={cart.items.length === 0 || isCheckingOut}
                onClick={handleCheckoutClick}
                className="w-full mt-3 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isCheckingOut ? 'Completing Sale...' : 'Checkout & Print Thermal (F9)'}
              </button>
            </div>
          </div>
        </div>

        {/* Schedule H / Doctor Prescription Modal (R7) */}
        {showRxModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">Schedule H / H1 Prescription Details Required</h3>
                </div>
                <button onClick={() => setShowRxModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-600">
                Legal compliance requires recording doctor registration and patient details for Schedule H/H1 drugs.
              </p>

              <form onSubmit={handleRxSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Doctor's Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Dr. R. Sharma"
                      value={prescriptionForm.doctorName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Doctor Reg No *</label>
                    <input
                      required
                      type="text"
                      placeholder="MCI-19842"
                      value={prescriptionForm.doctorRegNo}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorRegNo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Patient Name *</label>
                    <input
                      required
                      type="text"
                      value={prescriptionForm.patientName || customerName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Patient Age *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={prescriptionForm.patientAge}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientAge: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prescription Ref #</label>
                    <input
                      type="text"
                      placeholder="Rx-2026-09"
                      value={prescriptionForm.prescriptionNumber}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, prescriptionNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Drug Schedule</label>
                    <select
                      value={prescriptionForm.drugSchedule}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, drugSchedule: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    >
                      <option value="SCHEDULE_H">Schedule H</option>
                      <option value="SCHEDULE_H1">Schedule H1</option>
                      <option value="SCHEDULE_X">Schedule X</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowRxModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow"
                  >
                    {isCheckingOut ? 'Saving...' : 'Confirm & Complete Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Completed Sale Thermal Receipt Modal */}
        {completedReceiptData && (
          <div className="relative">
            <ThermalReceiptPreview
              data={completedReceiptData}
              onClose={() => {
                setCompletedReceiptData(null);
                barcodeRef.current?.focus();
              }}
            />
            {/* Floating WhatsApp Share Button on Receipt Preview */}
            <div className="fixed bottom-6 right-6 z-50">
              <button
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-2xl flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                Share Bill on WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
