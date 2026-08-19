'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Scan,
  Search,
  ShoppingCart,
  Trash2,
  PauseCircle,
  PlayCircle,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  AlertCircle,
  X,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useCartStore } from '../../stores/cart-store';
import { PaymentMode, PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function PosPage() {
  const { selectedBranchId } = useAuthStore();
  const cart = useCartStore();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activePaymentMode, setActivePaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [completedReceiptData, setCompletedReceiptData] = useState<ThermalReceiptDataDto | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode on mount & listen to keyboard shortcuts
  useEffect(() => {
    barcodeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search Medicine query
  const { data: searchResults } = useQuery({
    queryKey: ['pos-medicine-search', searchQuery, selectedBranchId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await apiClient.get('/medicines', {
        params: { search: searchQuery, branchId: selectedBranchId || undefined, limit: 8 },
      });
      return res.data?.data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Handle Quick Barcode Scan
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setErrorBanner(null);
    try {
      const res = await apiClient.get(`/pos/scan/${encodeURIComponent(barcodeInput.trim())}`, {
        params: { branchId: selectedBranchId || undefined },
      });

      const { medicine, fefoBatch, availableStock } = res.data;

      if (!fefoBatch || availableStock <= 0) {
        setErrorBanner(`No available active stock for '${medicine.name}'`);
        return;
      }

      cart.addItem({
        medicineId: medicine.id,
        name: medicine.name,
        sku: medicine.sku,
        dosageForm: medicine.dosageForm,
        batchId: fefoBatch.batchId,
        batchNumber: fefoBatch.batchNumber,
        expiryDate: fefoBatch.expiryDate ? formatDate(fefoBatch.expiryDate, 'MM-YYYY') : undefined,
        unit: medicine.baseUnit || 'PCS',
        qty: 1,
        rate: fefoBatch.sellingPrice,
        mrp: fefoBatch.sellingPrice,
        taxPercent: fefoBatch.taxPercent || 0,
        discountPercent: 0,
        availableStock,
      });

      setBarcodeInput('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || `Barcode '${barcodeInput}' not recognized`);
    } finally {
      barcodeRef.current?.focus();
    }
  };

  // Add Medicine from manual search result
  const handleSelectSearchResult = (medicine: any) => {
    const activeBatch = medicine.batches?.[0];
    if (!activeBatch || medicine.totalStock <= 0) {
      setErrorBanner(`No active stock for ${medicine.name}`);
      return;
    }

    cart.addItem({
      medicineId: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
      dosageForm: medicine.dosageForm,
      batchId: activeBatch.id,
      batchNumber: activeBatch.batchNumber,
      expiryDate: formatDate(activeBatch.expiryDate, 'MM-YYYY'),
      unit: medicine.baseUnit?.abbreviation || 'TAB',
      qty: 1,
      rate: activeBatch.sellingPrice,
      mrp: activeBatch.mrp,
      taxPercent: medicine.taxPercent,
      discountPercent: 0,
      availableStock: medicine.totalStock,
    });

    setSearchQuery('');
    setSearchFocused(false);
    barcodeRef.current?.focus();
  };

  // Checkout & Generate Thermal Receipt
  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      setErrorBanner('Cart is empty. Scan or search items first.');
      return;
    }

    if (!selectedBranchId) {
      setErrorBanner('Please select a store branch in the header.');
      return;
    }

    setErrorBanner(null);
    setIsCheckingOut(true);

    try {
      const grandTotal = cart.getGrandTotal();

      const payload = {
        branchId: selectedBranchId,
        customerName: customerName || undefined,
        customerMobile: customerMobile || undefined,
        items: cart.items.map((i) => ({
          medicineId: i.medicineId,
          batchId: i.batchId,
          qty: i.qty,
          rate: i.rate,
          discountPercent: i.discountPercent,
        })),
        payments: [
          {
            paymentMode: activePaymentMode,
            amount: grandTotal,
          },
        ],
        invoiceDiscountPercent: cart.invoiceDiscountPercent,
        paperWidth: cart.paperWidth,
      };

      const res = await apiClient.post('/pos/checkout', payload);
      const invoice = res.data;

      // Fetch formatted receipt data for modal preview and print
      const receiptRes = await apiClient.get(`/sales/${invoice.id}/receipt`, {
        params: { paperWidth: cart.paperWidth },
      });

      setCompletedReceiptData(receiptRes.data);
      cart.clearCart();
      setCustomerName('');
      setCustomerMobile('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.message || 'Checkout failed. Please review stock availability.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Error notification banner */}
        {errorBanner && (
          <div className="bg-red-600 text-white px-6 py-2.5 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="p-0.5 hover:bg-red-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* LEFT: Cart & Items Table */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Top Bar: Barcode & Manual Search */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-3">
              {/* Barcode Scanner Input */}
              <form onSubmit={handleBarcodeSubmit} className="flex-1 min-w-[240px] relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-600">
                  <Scan className="w-4 h-4 animate-pulse" />
                </div>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan Barcode / SKU (F1)..."
                  className="w-full pl-9 pr-4 py-2 bg-white border-2 border-sky-300 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition shadow-inner"
                />
              </form>

              {/* Medicine Manual Search */}
              <div className="flex-1 min-w-[240px] relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Medicine Name / Generic (F2)..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 transition"
                />

                {/* Search Typeahead Dropdown */}
                {searchFocused && searchResults && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-72 overflow-y-auto">
                    {searchResults.map((med: any) => (
                      <div
                        key={med.id}
                        onClick={() => handleSelectSearchResult(med)}
                        className="p-3 hover:bg-sky-50 cursor-pointer border-b border-slate-100 flex items-center justify-between text-xs transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{med.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {med.genericName} • {med.dosageForm} • SKU: {med.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sky-700">₹{med.defaultSellingPrice?.toFixed(2)}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">
                            Stock: {med.totalStock} {med.baseUnit?.abbreviation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear Cart Button */}
              {cart.items.length > 0 && (
                <button
                  onClick={cart.clearCart}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="flex-1 overflow-y-auto">
              {cart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-600 text-sm">POS Billing Counter Ready</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Scan any medicine barcode using a USB/Bluetooth scanner, or search by name. Earliest-expiry batches will be automatically selected.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item / Product</th>
                      <th className="py-2.5 px-3">FEFO Batch</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.items.map((item, idx) => (
                      <tr key={`${item.medicineId}-${item.batchId}`} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.sku}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono text-[10px] font-semibold border border-sky-200">
                            {item.batchNumber} (Exp: {item.expiryDate})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {item.rate.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => cart.updateItemQty(item.medicineId, item.qty - 1, item.batchId)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                cart.updateItemQty(
                                  item.medicineId,
                                  parseInt(e.target.value) || 1,
                                  item.batchId
                                )
                              }
                              className="w-12 text-center font-bold text-slate-900 border border-slate-300 rounded-md py-0.5 text-xs focus:outline-none focus:border-sky-500"
                            />
                            <button
                              onClick={() => cart.updateItemQty(item.medicineId, item.qty + 1, item.batchId)}
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
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
                            onChange={(e) =>
                              cart.updateItemDiscount(
                                item.medicineId,
                                parseFloat(e.target.value) || 0,
                                item.batchId
                              )
                            }
                            className="w-12 text-right border border-slate-300 rounded-md py-0.5 px-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono text-sm">
                          {item.lineTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => cart.removeItem(item.medicineId, item.batchId)}
                            className="text-red-400 hover:text-red-600 p-1 transition"
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
                  <span>Customer (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Payment Mode
                </label>
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

              {/* Paper Width Config */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-600">Thermal Width:</span>
                <div className="flex gap-2">
                  {[PaperWidth.WIDTH_58MM, PaperWidth.WIDTH_80MM].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => cart.setPaperWidth(w)}
                      className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border transition ${
                        cart.paperWidth === w
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
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
                <span className="font-mono text-emerald-600">
                  -₹{cart.getDiscountTotal().toFixed(2)}
                </span>
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
                onClick={handleCheckout}
                className="w-full mt-3 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isCheckingOut ? 'Completing Sale...' : 'Checkout & Print Thermal (F9)'}
              </button>
            </div>
          </div>
        </div>

        {/* Completed Sale Thermal Receipt Modal */}
        {completedReceiptData && (
          <ThermalReceiptPreview
            data={completedReceiptData}
            onClose={() => {
              setCompletedReceiptData(null);
              barcodeRef.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}
