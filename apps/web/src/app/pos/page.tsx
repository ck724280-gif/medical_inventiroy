'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Search,
  Barcode,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  ShieldAlert,
  MessageCircle,
  X,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Receipt,
  UserPlus,
  Coins,
  FileText,
  ChevronDown,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useCartStore, BatchOption } from '../../stores/cart-store';
import { PaymentMode, PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';
import { formatCurrency, generateWhatsAppInvoiceUrl, formatDate } from '@medical-inventory/shared-utils';

export default function PosPage() {
  const queryClient = useQueryClient();
  const { user, selectedBranchId } = useAuthStore();
  const cart = useCartStore();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activePaymentMode, setActivePaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<ThermalReceiptDataDto | null>(null);
  const [savedInvoiceData, setSavedInvoiceData] = useState<any | null>(null);

  // Mobile Active Tab: 'cart' | 'payment'
  const [mobileTab, setMobileTab] = useState<'cart' | 'payment'>('cart');

  // Modals
  const [batchModalItem, setBatchModalItem] = useState<{ medicineId: string; medicineName: string; currentBatchId?: string } | null>(null);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);

  // Shift Forms
  const [openingCashInput, setOpeningCashInput] = useState('1000');
  const [closingCashInput, setClosingCashInput] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Customer Add Form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    address: '',
    gstNumber: '',
    creditLimit: 0,
  });

  // Sales Return State
  const [returnInvoiceSearch, setReturnInvoiceSearch] = useState('');
  const [returnInvoiceData, setReturnInvoiceData] = useState<any | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<Record<string, { returnQty: number; condition: string; reason: string }>>({});
  const [returnRefundMode, setReturnRefundMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  // Schedule H Prescription Form
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
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'F1') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleLastBillReprint();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowHeldModal(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckoutClick();
      } else if (e.key === 'Escape') {
        setShowRxModal(false);
        setShowShiftModal(false);
        setShowHeldModal(false);
        setShowCustomerModal(false);
        setShowReturnModal(false);
        setShowSplitPaymentModal(false);
        setBatchModalItem(null);
        setCompletedReceiptData(null);
      } else if (!isInput) {
        if (e.key === 'Delete') {
          e.preventDefault();
          cart.removeSelectedItem();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          cart.incrementItemQty(cart.selectedItemIndex);
        } else if (e.key === '-') {
          e.preventDefault();
          cart.decrementItemQty(cart.selectedItemIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.selectedItemIndex, cart.items, isCheckingOut]);

  // ── Queries ────────────────────────────────────────────────

  // 0. Branches list to ensure active branch is always selected
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data?.data || res.data || [];
    },
  });

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      useAuthStore.getState().setSelectedBranchId(branches[0].id);
    }
  }, [selectedBranchId, branches]);

  const activeBranchId = selectedBranchId || branches[0]?.id || user?.branches?.[0]?.id || '';

  // 1. Current Cashier Shift
  const { data: currentShift, refetch: refetchShift } = useQuery({
    queryKey: ['pos-current-shift', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/pos/shift/current', {
        params: { branchId: activeBranchId || undefined },
      });
      return res.data?.data || res.data || null;
    },
    enabled: true,
  });

  // 2. Medicine Search
  const { data: searchResults = [] } = useQuery({
    queryKey: ['pos-search', debouncedSearch, selectedBranchId],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await apiClient.get('/pos/search', {
        params: { q: debouncedSearch, branchId: selectedBranchId },
      });
      return res.data?.data || res.data || [];
    },
    enabled: !!debouncedSearch && !!selectedBranchId,
  });

  // 3. Held Carts
  const { data: heldCartsList = [], refetch: refetchHeld } = useQuery({
    queryKey: ['pos-held-carts', selectedBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/pos/held', {
        params: { branchId: selectedBranchId },
      });
      return res.data?.data || res.data || [];
    },
    enabled: !!selectedBranchId,
  });

  // 4. Batch Selector
  const { data: medicineBatches = [] } = useQuery({
    queryKey: ['pos-batches', batchModalItem?.medicineId, selectedBranchId],
    queryFn: async () => {
      if (!batchModalItem?.medicineId) return [];
      const res = await apiClient.get(`/pos/batches/${batchModalItem.medicineId}`, {
        params: { branchId: selectedBranchId },
      });
      return res.data?.data || res.data || [];
    },
    enabled: !!batchModalItem?.medicineId && !!selectedBranchId,
  });

  // ── Handlers ───────────────────────────────────────────────

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      const res = await apiClient.get(`/pos/scan/${encodeURIComponent(code)}`, {
        params: { branchId: selectedBranchId },
      });

      const scanData = res.data?.data || res.data;
      if (scanData?.medicine) {
        cart.scanBarcodeItem({
          medicineId: scanData.medicine.id,
          name: scanData.medicine.name,
          genericName: scanData.medicine.genericName,
          sku: scanData.medicine.sku,
          barcode: scanData.medicine.barcode,
          hsnCode: scanData.medicine.hsnCode,
          qty: 1,
          rate: scanData.fefoBatch?.sellingPrice ?? scanData.medicine.defaultSellingPrice,
          mrp: scanData.fefoBatch?.mrp ?? scanData.medicine.mrp,
          batchId: scanData.fefoBatch?.id,
          batchNumber: scanData.fefoBatch?.batchNumber,
          expiryDate: scanData.fefoBatch?.expiryDate ? formatDate(scanData.fefoBatch.expiryDate, 'MM/YY') : undefined,
          taxPercent: scanData.fefoBatch?.taxPercent ?? scanData.medicine.taxPercent,
          discountPercent: 0,
          unit: scanData.medicine.baseUnit,
          unitLevel: 'TABLET',
          availableStock: scanData.availableStock,
          prescriptionRequired: scanData.medicine.prescriptionRequired,
          drugSchedule: scanData.medicine.drugSchedule,
          batches: scanData.batches,
        });

        setBarcodeInput('');
        barcodeRef.current?.focus();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Barcode not found or inactive.');
    }
  };

  const handleAddSearchResult = (med: any) => {
    cart.addItem({
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      sku: med.sku,
      barcode: med.barcode,
      hsnCode: med.hsnCode,
      qty: 1,
      rate: med.fefoBatch?.sellingPrice ?? med.defaultSellingPrice,
      mrp: med.fefoBatch?.mrp ?? med.mrp,
      batchId: med.fefoBatch?.id,
      batchNumber: med.fefoBatch?.batchNumber,
      expiryDate: med.fefoBatch?.expiryDate ? formatDate(med.fefoBatch.expiryDate, 'MM/YY') : undefined,
      taxPercent: med.fefoBatch?.taxPercent ?? med.taxPercent,
      discountPercent: 0,
      unit: med.baseUnit,
      unitLevel: 'TABLET',
      availableStock: med.availableStock,
      prescriptionRequired: med.prescriptionRequired,
      drugSchedule: med.drugSchedule,
      batches: med.batches,
    });

    setSearchQuery('');
    setDebouncedSearch('');
    barcodeRef.current?.focus();
  };

  const handleHoldCart = async () => {
    if (cart.items.length === 0) {
      alert('Cart is empty.');
      return;
    }

    try {
      await apiClient.post('/pos/hold', {
        name: cart.customer?.name ? `Bill for ${cart.customer.name}` : undefined,
        customer: cart.customer,
        cart: {
          items: cart.items,
          payments: cart.payments,
          invoiceDiscountPercent: cart.invoiceDiscountPercent,
          notes: cart.notes,
        },
        branchId: activeBranchId,
      });

      cart.clearCart();
      refetchHeld();
      alert('Bill held successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to hold bill.');
    }
  };

  const handleResumeHeldCart = async (id: string) => {
    try {
      const res = await apiClient.post(`/pos/resume/${id}`);
      const held = res.data?.data || res.data;
      if (held) {
        cart.setItems(held.items || []);
        if (held.customer) cart.setCustomer(held.customer);
        if (held.invoiceDiscountPercent) cart.setInvoiceDiscount(held.invoiceDiscountPercent);
        if (held.notes) cart.setNotes(held.notes);
      }
      setShowHeldModal(false);
      refetchHeld();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume held bill.');
    }
  };

  const handleDeleteHeldCart = async (id: string) => {
    try {
      await apiClient.delete(`/pos/held/${id}`);
      refetchHeld();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete held bill.');
    }
  };

  const handleLastBillReprint = async () => {
    try {
      const res = await apiClient.get('/pos/last-bill', {
        params: { branchId: activeBranchId || undefined },
      });
      const data = res.data?.data || res.data;
      if (data?.receipt) {
        setCompletedReceiptData({ ...data.receipt, isReprint: true });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'No previous invoice found.');
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/pos/shift/open', {
        branchId: activeBranchId || undefined,
        openingCash: parseFloat(openingCashInput) || 0,
        notes: shiftNotes || undefined,
      });
      setShowShiftModal(false);
      refetchShift();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to open shift.');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift?.shiftId) return;

    if (!confirm('Are you sure you want to close the current cashier shift?')) return;

    try {
      await apiClient.post('/pos/shift/close', {
        shiftId: currentShift.shiftId,
        closingCash: parseFloat(closingCashInput) || 0,
        notes: shiftNotes || undefined,
      });
      setShowShiftModal(false);
      setClosingCashInput('');
      refetchShift();
      alert('Shift closed successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close shift.');
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.mobile) {
      alert('Name and Mobile number are required');
      return;
    }

    try {
      const res = await apiClient.post('/customers', newCustomer);
      const created = res.data?.data || res.data;
      cart.setCustomer(created);
      setShowCustomerModal(false);
      setNewCustomer({ name: '', mobile: '', address: '', gstNumber: '', creditLimit: 0 });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add customer.');
    }
  };

  const handleSearchReturnInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnInvoiceSearch.trim()) return;

    try {
      const res = await apiClient.get('/sales', {
        params: { search: returnInvoiceSearch.trim(), branchId: activeBranchId || undefined },
      });
      const list = res.data?.data || res.data?.sales || [];
      if (list.length === 0) {
        alert('Invoice not found.');
        return;
      }

      const invoiceRes = await apiClient.get(`/sales/${list[0].id}`);
      const fullInvoice = invoiceRes.data?.data || invoiceRes.data;
      setReturnInvoiceData(fullInvoice);

      const initial: Record<string, any> = {};
      for (const item of fullInvoice.items || []) {
        initial[item.id] = { returnQty: 0, condition: 'RESALABLE', reason: 'Customer Return' };
      }
      setReturnItemsState(initial);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch invoice.');
    }
  };

  const handleProcessReturn = async () => {
    if (!returnInvoiceData) return;

    const itemsToReturn = Object.entries(returnItemsState)
      .filter(([_, v]) => v.returnQty > 0)
      .map(([salesItemId, v]) => {
        const matchingItem = returnInvoiceData.items.find((it: any) => it.id === salesItemId);
        return {
          salesItemId,
          medicineId: matchingItem.medicineId,
          batchId: matchingItem.batchId,
          returnQty: v.returnQty,
          condition: v.condition,
          reason: v.reason,
        };
      });

    if (itemsToReturn.length === 0) {
      alert('Please select at least 1 item and quantity to return.');
      return;
    }

    setIsProcessingReturn(true);
    try {
      await apiClient.post('/sales-returns', {
        salesInvoiceId: returnInvoiceData.id,
        branchId: activeBranchId,
        refundMode: returnRefundMode,
        items: itemsToReturn,
      });

      alert('Sales return processed successfully.');
      setShowReturnModal(false);
      setReturnInvoiceData(null);
      setReturnInvoiceSearch('');
      queryClient.invalidateQueries({ queryKey: ['pos-current-shift'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process sales return.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  const hasScheduleHDrug = cart.items.some((i) => i.prescriptionRequired);

  const handleCheckoutClick = () => {
    if (cart.items.length === 0) {
      alert('Cart is empty.');
      return;
    }

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

  const executeCheckout = async (rxData?: any) => {
    setIsCheckingOut(true);
    try {
      const grandTotal = cart.getGrandTotal();
      let payments = cart.payments;

      if (payments.length === 1 && payments[0].paymentMode === PaymentMode.CASH) {
        payments = [{ paymentMode: activePaymentMode, amount: grandTotal }];
      }

      const payload = {
        branchId: activeBranchId,
        customerId: cart.customer?.id || null,
        customerName: cart.customer?.name || undefined,
        customerMobile: cart.customer?.mobile || undefined,
        customerGstin: cart.customer?.gstNumber || undefined,
        items: cart.items.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId,
          qty: item.qty,
          unitLevel: item.unitLevel || 'TABLET',
          rate: item.rate,
          discountPercent: item.discountPercent,
        })),
        payments,
        invoiceDiscountPercent: cart.invoiceDiscountPercent,
        paperWidth: cart.paperWidth,
        notes: cart.notes,
        shiftId: currentShift?.shiftId || undefined,
        idempotencyKey: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prescription: rxData || null,
      };

      const res = await apiClient.post('/pos/checkout', payload);
      const invoice = res.data?.data || res.data;
      setSavedInvoiceData(invoice);

      if (invoice?.id) {
        const receiptRes = await apiClient.get(`/sales/${invoice.id}/receipt`, {
          params: { paperWidth: cart.paperWidth },
        });
        setCompletedReceiptData(receiptRes.data?.data || receiptRes.data);
      }

      cart.clearCart();
      setShowRxModal(false);
      refetchShift();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed. Please check stock and limits.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!savedInvoiceData) return;
    const phone = cart.customer?.mobile || prompt('Enter customer WhatsApp mobile:');
    if (!phone) return;
    const url = generateWhatsAppInvoiceUrl(phone, savedInvoiceData.invoiceNumber, savedInvoiceData.totalAmount);
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-[#090d16] overflow-hidden select-none text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-[#090d16]">
        <Header />

        {/* ── Top Secondary Action & Shift Bar ───────────────────── */}
        <div className="h-auto min-h-[48px] py-2 px-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c1220] flex-shrink-0 text-xs shadow-sm">
          {/* Shift Status Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShiftModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                currentShift
                  ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300'
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-sky-500' : 'bg-amber-500'}`} />
              <span>
                {currentShift
                  ? `Shift: Active (Cash: ${formatCurrency(currentShift.totalCashSales + currentShift.openingCash)})`
                  : 'No Active Shift — Click to Open'}
              </span>
              <Coins className="w-3.5 h-3.5 ml-0.5 opacity-70" />
            </button>
          </div>

          {/* Action Buttons: Hold, Return, Last Bill */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setShowHeldModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Hold & Resume Bills (F8)"
            >
              <PauseCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Held</span>
              {heldCartsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
                  {heldCartsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowReturnModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Return</span>
            </button>

            <button
              onClick={handleLastBillReprint}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Reprint Last Invoice (F4)"
            >
              <Receipt className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Last Bill</span>
            </button>

            <button
              disabled={cart.items.length === 0}
              onClick={handleHoldCart}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Hold Cart</span>
            </button>
          </div>
        </div>

        {/* ── Mobile View Toggle Tabs ───────────────────────────── */}
        <div className="lg:hidden flex border-b border-slate-800 bg-slate-900/90 text-xs font-semibold">
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-2 ${
              mobileTab === 'cart'
                ? 'border-sky-400 text-sky-400 bg-slate-800/50'
                : 'border-transparent text-slate-400'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Items &amp; Cart ({cart.items.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('payment')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-2 ${
              mobileTab === 'payment'
                ? 'border-sky-400 text-sky-400 bg-slate-800/50'
                : 'border-transparent text-slate-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment (₹{cart.getGrandTotal().toFixed(2)})</span>
          </button>
        </div>

        {/* ── Main Workspace ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2.5 sm:p-4 gap-3 sm:gap-4">
          
          {/* LEFT: Item Entry & Cart Table */}
          <div
            className={`flex-1 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col overflow-hidden ${
              mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Top Scanning & Search Controls */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-50 dark:bg-[#0d1424] relative">
              {/* Barcode Quick Scan */}
              <form onSubmit={handleBarcodeScan} className="w-full sm:w-2/5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Barcode className="w-4 h-4" />
                </div>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan Barcode / SKU (Enter)... [F1]"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </form>

              {/* Medicine Autocomplete Search */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Medicine, Generic, Brand, Molecule..."
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 shadow-2xl">
                    {searchResults.map((med: any) => (
                      <div
                        key={med.id}
                        onClick={() => handleAddSearchResult(med)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center transition group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300">
                              {med.name}
                            </p>
                            {med.prescriptionRequired && (
                              <span className="px-1.5 py-0.2 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[9px] font-bold">
                                Rx ({med.drugSchedule || 'H'})
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="text-sky-600 dark:text-sky-400 font-mono">{med.genericName || med.brandName || 'Generics'}</span> • MFR: {med.manufacturer}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            <span>Batch: <strong className="text-sky-600 dark:text-sky-300">{med.fefoBatch?.batchNumber || 'Auto-FEFO'}</strong></span>
                            <span>Exp: {med.fefoBatch?.expiryDate ? formatDate(med.fefoBatch.expiryDate, 'MM/YY') : 'N/A'}</span>
                            <span>Stock: <strong className={med.availableStock > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{med.availableStock} {med.baseUnit}</strong></span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono font-bold text-sky-600 dark:text-sky-300">
                            ₹{Number(med.fefoBatch?.sellingPrice ?? med.defaultSellingPrice).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-400 line-through">
                            MRP: ₹{Number(med.fefoBatch?.mrp ?? med.mrp).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Table Container */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              {cart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                    <ShoppingCart className="w-7 h-7 stroke-1" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cart is Empty</p>
                  <p className="text-xs text-slate-500 max-w-sm text-center">
                    Scan barcode or search medicines to add items. FEFO batch is auto-selected.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                  <thead className="bg-slate-100/90 dark:bg-[#0c1322] text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Medicine &amp; Batch</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-center">Qty (+/-)</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Tax %</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {cart.items.map((item, idx) => {
                      const isSelected = cart.selectedItemIndex === idx;
                      return (
                        <tr
                          key={`${item.medicineId}-${item.batchId || idx}`}
                          onClick={() => cart.setSelectedItemIndex(idx)}
                          className={`transition cursor-pointer ${
                            isSelected ? 'bg-sky-50 dark:bg-slate-800/80 border-l-2 border-sky-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 dark:text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.prescriptionRequired && (
                                <span className="px-1.5 py-0.2 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-mono text-[9px] font-bold">
                                  Rx
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBatchModalItem({
                                    medicineId: item.medicineId,
                                    medicineName: item.name,
                                    currentBatchId: item.batchId,
                                  });
                                }}
                                className="px-1.5 py-0.2 rounded font-mono text-[10px] font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                              >
                                <span>Batch: {item.batchNumber || 'Auto-FEFO'}</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                              <span className="text-slate-400">MRP: ₹{item.mrp}</span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                            ₹{Number(item.rate || 0).toFixed(2)}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <select
                              value={item.unitLevel || 'TABLET'}
                              onChange={(e) => cart.updateItemUnitLevel(item.medicineId, e.target.value, item.batchId)}
                              className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 text-sky-600 dark:text-sky-300 border border-slate-200 dark:border-slate-700 rounded font-semibold text-[10px] focus:outline-none"
                            >
                              <option value="TABLET">Tablet</option>
                              <option value="STRIP">Strip</option>
                              <option value="BOX">Box</option>
                            </select>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cart.decrementItemQty(idx);
                                }}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => cart.updateItemQty(item.medicineId, parseInt(e.target.value) || 1, item.batchId)}
                                className="w-11 text-center font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 text-xs focus:outline-none focus:border-sky-500"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cart.incrementItemQty(idx);
                                }}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => cart.updateItemDiscount(item.medicineId, parseFloat(e.target.value) || 0, item.batchId)}
                              className="w-12 text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 px-1 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                            />
                          </td>

                          <td className="py-2 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                            {item.taxPercent}%
                          </td>

                          <td className="py-2 px-3 text-right font-bold text-sky-600 dark:text-sky-300 font-mono text-xs">
                            ₹{Number(item.lineTotal || 0).toFixed(2)}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cart.removeItem(item.medicineId, item.batchId);
                              }}
                              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Keyboard Shortcuts Cheat Sheet (Desktop) */}
            <div className="hidden lg:flex p-2 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1220] items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">F1</kbd> Search</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">F2</kbd> Customer</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">F4</kbd> Last Bill</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">F8</kbd> Hold</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">F9</kbd> Checkout</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-sky-300">+/-</kbd> Qty</span>
              </div>
              <span className="text-sky-600 dark:text-sky-400 font-mono text-[10px]">{cart.items.length} items</span>
            </div>
          </div>

          {/* RIGHT: Customer, Payment & Checkout Panel */}
          <div
            className={`w-full lg:w-96 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col p-4 gap-4 justify-between ${
              mobileTab === 'payment' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="space-y-3.5">
              {/* Customer Quick Card */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Customer</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-500 transition font-medium"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ New (F2)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Mobile number"
                    value={cart.customer?.mobile || ''}
                    onChange={(e) =>
                      cart.setCustomer({
                        ...cart.customer,
                        mobile: e.target.value,
                        name: cart.customer?.name || 'Walk-in Customer',
                      })
                    }
                    className="px-2.5 py-1.5 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={cart.customer?.name || ''}
                    onChange={(e) =>
                      cart.setCustomer({
                        ...cart.customer,
                        name: e.target.value,
                      })
                    }
                    className="px-2.5 py-1.5 bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {cart.customer?.creditLimit ? (
                  <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Balance: <strong className="text-amber-600 dark:text-amber-400">₹{cart.customer.currentBalance || 0}</strong></span>
                    <span className="text-slate-500 dark:text-slate-400">Limit: <strong className="text-sky-600 dark:text-sky-300">₹{cart.customer.creditLimit}</strong></span>
                  </div>
                ) : null}
              </div>

              {/* Payment Mode Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Payment Mode</label>
                  <button
                    type="button"
                    onClick={() => setShowSplitPaymentModal(true)}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-500 font-mono transition"
                  >
                    Split Payment &gt;
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { mode: PaymentMode.CASH, label: 'Cash', icon: Banknote },
                    { mode: PaymentMode.UPI, label: 'UPI / QR', icon: Smartphone },
                    { mode: PaymentMode.CARD, label: 'Card', icon: CreditCard },
                    { mode: PaymentMode.CREDIT, label: 'Credit', icon: FileText },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = activePaymentMode === p.mode;
                    return (
                      <button
                        key={p.mode}
                        type="button"
                        onClick={() => setActivePaymentMode(p.mode)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold gap-1 transition ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md font-bold'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Tender Helper */}
              {activePaymentMode === PaymentMode.CASH && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Cash Tendered:</span>
                    <input
                      type="number"
                      value={cart.receivedCash || ''}
                      onChange={(e) => cart.setReceivedCash(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: 'Exact', val: cart.getGrandTotal() },
                      { label: '₹100', val: 100 },
                      { label: '₹500', val: 500 },
                      { label: '₹2000', val: 2000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => cart.setReceivedCash(btn.val)}
                        className="py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-800 dark:text-sky-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Change to Return:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(cart.getChangeAmount())}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary & Primary Checkout */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{cart.getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Discount Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">-₹{cart.getDiscountTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Tax / GST:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{cart.getTaxTotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">TOTAL PAYABLE:</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  ₹{cart.getGrandTotal().toFixed(2)}
                </span>
              </div>

              <button
                disabled={cart.items.length === 0 || isCheckingOut}
                onClick={handleCheckoutClick}
                className="w-full mt-3 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isCheckingOut ? 'Completing Sale...' : 'Checkout & Print Thermal (F9)'}
              </button>
            </div>
          </div>
        </div>

        {/* ── MODALS (Fully Mobile & PC Responsive) ─────────────── */}

        {/* Modal 1: Batch Selector */}
        {batchModalItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 max-w-lg w-full p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">Select Batch</h3>
                  <p className="text-[10px] text-sky-400 font-mono">{batchModalItem.medicineName}</p>
                </div>
                <button onClick={() => setBatchModalItem(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {medicineBatches.length === 0 ? (
                  <p className="text-slate-400 text-center py-6">No alternative active batches found.</p>
                ) : (
                  medicineBatches.map((b: BatchOption, idx: number) => {
                    const isSelected = b.id === batchModalItem.currentBatchId;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          cart.switchItemBatch(batchModalItem.medicineId, batchModalItem.currentBatchId, b);
                          setBatchModalItem(null);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-sky-950 border-sky-500' : 'bg-slate-850 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{b.batchNumber}</span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[9px] font-bold">
                                FEFO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Exp: {formatDate(b.expiryDate, 'MM/YY')} • Stock: {b.currentQty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sky-300 text-xs">₹{b.sellingPrice}</p>
                          <p className="text-[10px] text-slate-500 line-through">MRP: ₹{b.mrp}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Shift Manager */}
        {showShiftModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sky-400">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Cashier Register &amp; Shift</h3>
                </div>
                <button onClick={() => setShowShiftModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {currentShift ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">Opening Float</p>
                      <p className="text-sm font-bold text-white">₹{currentShift.openingCash}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">Cash Sales</p>
                      <p className="text-sm font-bold text-emerald-400">₹{currentShift.totalCashSales}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">UPI / Digital Sales</p>
                      <p className="text-sm font-bold text-sky-300">₹{currentShift.totalUpiSales + currentShift.totalCardSales}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">Expected Cash</p>
                      <p className="text-sm font-bold text-amber-300">₹{currentShift.expectedCash}</p>
                    </div>
                  </div>

                  <form onSubmit={handleCloseShift} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Physical Cash Counted in Drawer (₹) *
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="Counted cash amount"
                        value={closingCashInput}
                        onChange={(e) => setClosingCashInput(e.target.value)}
                        className="w-full px-3 py-2 night-input font-mono text-sm text-white"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShiftModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg transition"
                      >
                        Close &amp; Finalize Shift
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleOpenShift} className="space-y-4">
                  <p className="text-slate-400 text-xs">
                    Start a cashier shift by entering the opening cash drawer float amount.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Opening Cash Float (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                      className="w-full px-3 py-2 night-input font-mono text-sm text-white"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowShiftModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition"
                    >
                      Open Cashier Shift
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal 3: Held Bills */}
        {showHeldModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 max-w-xl w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sky-400">
                  <PauseCircle className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Held Carts &amp; Suspended Bills</h3>
                </div>
                <button onClick={() => setShowHeldModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {heldCartsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <PauseCircle className="w-10 h-10 mx-auto stroke-1 mb-2 opacity-50" />
                    <p>No active suspended bills.</p>
                  </div>
                ) : (
                  heldCartsList.map((held: any) => (
                    <div
                      key={held.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400">{held.code}</span>
                          <span className="font-semibold text-slate-200">{held.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {held.itemCount} items • {new Date(held.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-white">
                          ₹{held.totalAmount?.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleResumeHeldCart(held.id)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-[11px] flex items-center gap-1 text-white"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleDeleteHeldCart(held.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal 4: Quick Add Customer */}
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sky-400">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Quick Add Customer</h3>
                </div>
                <button onClick={() => setShowCustomerModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Customer / Patient Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 night-input text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="9876543210"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    className="w-full px-3 py-2 night-input font-mono text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newCustomer.creditLimit || ''}
                      onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 night-input font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="29AAAAA0000A1Z5"
                      value={newCustomer.gstNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 night-input font-mono text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white shadow-lg transition"
                  >
                    Save &amp; Select
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 5: Sales Return */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 max-w-2xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Sales Return &amp; Refund</h3>
                </div>
                <button onClick={() => setShowReturnModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSearchReturnInvoice} className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="Enter Invoice # (e.g. INV-000001)..."
                  value={returnInvoiceSearch}
                  onChange={(e) => setReturnInvoiceSearch(e.target.value)}
                  className="flex-1 px-3 py-2 night-input text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white text-xs flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Lookup
                </button>
              </form>

              {returnInvoiceData && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white font-mono">{returnInvoiceData.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-400">
                        Date: {formatDate(returnInvoiceData.createdAt)} • Customer: {returnInvoiceData.customer?.name || 'Walk-in'}
                      </p>
                    </div>
                    <span className="font-bold font-mono text-sky-300">
                      Total: ₹{returnInvoiceData.totalAmount}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {returnInvoiceData.items.map((it: any) => {
                      const state = returnItemsState[it.id] || { returnQty: 0, condition: 'RESALABLE', reason: '' };
                      return (
                        <div
                          key={it.id}
                          className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-white">{it.medicine?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Sold Qty: {it.qty} • Rate: ₹{it.rate}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={state.condition}
                              onChange={(e) =>
                                setReturnItemsState({
                                  ...returnItemsState,
                                  [it.id]: { ...state, condition: e.target.value },
                                })
                              }
                              className="px-2 py-1 bg-slate-900 text-sky-300 border border-slate-700 rounded-lg text-[10px]"
                            >
                              <option value="RESALABLE">Resalable</option>
                              <option value="DAMAGED">Damaged</option>
                              <option value="EXPIRED">Expired</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min="0"
                                max={it.qty}
                                value={state.returnQty}
                                onChange={(e) =>
                                  setReturnItemsState({
                                    ...returnItemsState,
                                    [it.id]: {
                                      ...state,
                                      returnQty: Math.min(it.qty, Math.max(0, parseInt(e.target.value) || 0)),
                                    },
                                  })
                                }
                                className="w-12 px-1.5 py-1 text-center bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Refund Mode:</span>
                      <select
                        value={returnRefundMode}
                        onChange={(e) => setReturnRefundMode(e.target.value as PaymentMode)}
                        className="px-2 py-1 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs"
                      >
                        <option value={PaymentMode.CASH}>Cash</option>
                        <option value={PaymentMode.UPI}>UPI</option>
                        <option value={PaymentMode.CREDIT}>Credit / Ledger</option>
                      </select>
                    </div>
                    <button
                      disabled={isProcessingReturn}
                      onClick={handleProcessReturn}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
                    >
                      {isProcessingReturn ? 'Processing...' : 'Confirm Return'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal 6: Schedule H Rx */}
        {showRxModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-red-900 bg-slate-900 max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-red-950">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-white">Schedule H Prescription Required</h3>
                </div>
                <button onClick={() => setShowRxModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRxSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Doctor Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Dr. R. Sharma"
                      value={prescriptionForm.doctorName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorName: e.target.value })}
                      className="w-full px-3 py-2 night-input text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Doctor Reg No *</label>
                    <input
                      required
                      type="text"
                      placeholder="MCI-19842"
                      value={prescriptionForm.doctorRegNo}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorRegNo: e.target.value })}
                      className="w-full px-3 py-2 night-input font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Patient Name *</label>
                    <input
                      required
                      type="text"
                      value={prescriptionForm.patientName || cart.customer?.name || ''}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientName: e.target.value })}
                      className="w-full px-3 py-2 night-input text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Patient Age *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={prescriptionForm.patientAge}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientAge: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 night-input font-mono text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRxModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg transition"
                  >
                    {isCheckingOut ? 'Saving...' : 'Confirm & Complete Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 7: Thermal Receipt & WhatsApp */}
        {completedReceiptData && (
          <div className="relative">
            <ThermalReceiptPreview
              data={completedReceiptData}
              onClose={() => {
                setCompletedReceiptData(null);
                barcodeRef.current?.focus();
              }}
            />
            <div className="fixed bottom-6 right-6 z-50">
              <button
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-2xl flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                Share Receipt on WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
