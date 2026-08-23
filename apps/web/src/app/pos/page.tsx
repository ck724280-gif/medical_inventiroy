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
  Camera,
} from 'lucide-react';

import { Sidebar } from '../../components/sidebar';
import { Header } from '../../components/header';
import { ThermalReceiptPreview } from '../../components/thermal-receipt-preview';
import { CameraBarcodeScanner } from '../../components/camera-barcode-scanner';
import { SmartAutocomplete, HighlightMatch } from '../../components/ui/smart-autocomplete';
import { apiClient } from '../../lib/api-client';
import { shareInvoiceViaWhatsApp } from '../../lib/whatsapp-share';
import { useAuthStore } from '../../stores/auth-store';
import { useBrandingStore } from '../../stores/branding-store';
import { useCartStore, BatchOption } from '../../stores/cart-store';
import { PaymentMode, PaperWidth, ThermalReceiptDataDto } from '@medical-inventory/shared-types';
import { formatCurrency, formatDate } from '@medical-inventory/shared-utils';

export default function PosPage() {
  const queryClient = useQueryClient();
  const { user, selectedBranchId, isSuperAdmin, hasPermission } = useAuthStore();
  const { name: storeName } = useBrandingStore();
  const canEditRate = isSuperAdmin() || hasPermission('sale.edit') || hasPermission('price.override');
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
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Split Payment Rows
  const [splitPaymentRows, setSplitPaymentRows] = useState<{ mode: PaymentMode; amount: number; ref?: string }[]>([
    { mode: PaymentMode.CASH, amount: 0 },
    { mode: PaymentMode.UPI, amount: 0 },
  ]);

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

  const handleDirectCodeScan = async (code: string) => {
    try {
      const res = await apiClient.get(`/pos/scan/${encodeURIComponent(code)}`, {
        params: { branchId: selectedBranchId },
      });

      const scanData = res.data?.data || res.data;
      if (scanData?.medicine) {
        const rate = Number(scanData.fefoBatch?.sellingPrice ?? scanData.medicine.defaultSellingPrice);
        cart.scanBarcodeItem({
          medicineId: scanData.medicine.id,
          name: scanData.medicine.name,
          genericName: scanData.medicine.genericName,
          sku: scanData.medicine.sku,
          barcode: scanData.medicine.barcode,
          hsnCode: scanData.medicine.hsnCode,
          qty: 1,
          baseRate: rate,
          rate,
          mrp: Number(scanData.fefoBatch?.mrp ?? scanData.medicine.mrp),
          batchId: scanData.fefoBatch?.id,
          batchNumber: scanData.fefoBatch?.batchNumber,
          expiryDate: scanData.fefoBatch?.expiryDate ? formatDate(scanData.fefoBatch.expiryDate, 'MM/YY') : undefined,
          taxPercent: Number(scanData.fefoBatch?.taxPercent ?? scanData.medicine.taxPercent),
          discountPercent: 0,
          unit: scanData.medicine.baseUnit || 'PCS',
          unitLevel: 'STRIP',
          stripsPerBox: scanData.medicine.stripsPerBox || 10,
          tabletsPerStrip: scanData.medicine.tabletsPerStrip || 10,
          availableStock: scanData.availableStock,
          prescriptionRequired: scanData.medicine.prescriptionRequired,
          drugSchedule: scanData.medicine.drugSchedule,
          batches: scanData.batches,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Barcode not found or inactive.');
    }
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    await handleDirectCodeScan(code);
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const handleAddSearchResult = (med: any) => {
    const rate = Number(med.fefoBatch?.sellingPrice ?? med.defaultSellingPrice);
    cart.addItem({
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      sku: med.sku,
      barcode: med.barcode,
      hsnCode: med.hsnCode,
      qty: 1,
      baseRate: rate,
      rate,
      mrp: Number(med.fefoBatch?.mrp ?? med.mrp),
      batchId: med.fefoBatch?.id,
      batchNumber: med.fefoBatch?.batchNumber,
      expiryDate: med.fefoBatch?.expiryDate ? formatDate(med.fefoBatch.expiryDate, 'MM/YY') : undefined,
      taxPercent: Number(med.fefoBatch?.taxPercent ?? med.taxPercent),
      discountPercent: 0,
      unit: med.baseUnit || 'PCS',
      unitLevel: 'STRIP',
      stripsPerBox: med.stripsPerBox || 10,
      tabletsPerStrip: med.tabletsPerStrip || 10,
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

  const handleWhatsAppShare = async () => {
    if (!savedInvoiceData) return;
    await shareInvoiceViaWhatsApp({
      invoiceNumber: savedInvoiceData.invoiceNumber,
      customerName: savedInvoiceData.customer?.name || cart.customer?.name,
      customerMobile: savedInvoiceData.customer?.mobile || cart.customer?.mobile,
      totalAmount: savedInvoiceData.totalAmount,
      storeName: storeName || 'Medical Store',
      pdfUrl: savedInvoiceData.id ? `${window.location.origin}/api/sales/public/${savedInvoiceData.id}/pdf` : undefined,
      items: (savedInvoiceData.items || []).map((it: any) => ({
        name: it.medicine?.name || it.name || 'Product',
        qty: it.qty,
        unit: it.unitLevel || 'Unit',
        total: it.lineTotal || (it.rate * it.qty),
      })),
    });
  };

  return (
    <div className="flex h-screen bg-surface-page text-text-primary font-sans transition-colors duration-200 overflow-hidden select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface-page">
        <Header />

        {/* ── Top Secondary Action & Shift Bar ───────────────────── */}
        <div className="h-auto min-h-[48px] py-2 px-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-base flex-shrink-0 text-xs shadow-sm">
          {/* Shift Status Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShiftModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                currentShift
                  ? 'bg-accent-subtle border-accent-subtle-border text-accent'
                  : 'bg-status-warning-bg border-status-warning-border text-status-warning'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  currentShift ? 'bg-accent' : 'bg-status-warning'
                }`}
              />
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-surface-raised text-text-primary hover:bg-surface-hover transition cursor-pointer"
              title="Hold & Resume Bills (F8)"
            >
              <PauseCircle className="w-3.5 h-3.5 text-accent" />
              <span>Held</span>
              {heldCartsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-accent text-accent-foreground font-bold text-[10px]">
                  {heldCartsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowReturnModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-surface-raised text-text-primary hover:bg-surface-hover transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-status-warning" />
              <span>Return</span>
            </button>

            <button
              onClick={handleLastBillReprint}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-surface-raised text-text-primary hover:bg-surface-hover transition cursor-pointer"
              title="Reprint Last Invoice (F4)"
            >
              <Receipt className="w-3.5 h-3.5 text-accent" />
              <span>Last Bill</span>
            </button>

            <button
              disabled={cart.items.length === 0}
              onClick={handleHoldCart}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-status-warning-border bg-status-warning-bg text-status-warning hover:bg-status-warning-bg/80 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer font-medium"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Hold Cart</span>
            </button>
          </div>
        </div>

        {/* ── Mobile View Toggle Tabs ───────────────────────────── */}
        <div className="lg:hidden flex border-b border-border bg-surface-base text-xs font-semibold">
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              mobileTab === 'cart'
                ? 'border-accent text-accent bg-accent-subtle'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Items &amp; Cart ({cart.items.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('payment')}
            className={`flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-2 transition ${
              mobileTab === 'payment'
                ? 'border-accent text-accent bg-accent-subtle'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment (₹{cart.getGrandTotal().toFixed(2)})</span>
          </button>
        </div>

        {/* ── Main Workspace ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2.5 sm:p-4 gap-3 sm:gap-4 pb-16 lg:pb-0">
          {/* LEFT: Item Entry & Cart Table */}
          <div
            className={`flex-1 bg-surface-base rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden ${
              mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Top Scanning & Search Controls */}
            <div className="p-3 border-b border-border flex flex-col sm:flex-row gap-2 sm:gap-3 bg-surface-raised relative">
              {/* Barcode Quick Scan */}
              <form onSubmit={handleBarcodeScan} className="w-full sm:w-2/5 relative flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    ref={barcodeRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan Barcode / SKU (Enter)... [F1]"
                    className="w-full pl-9 pr-3 py-2 bg-surface-base border border-border rounded-xl text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="px-3 py-2 bg-accent-subtle text-accent hover:bg-accent-subtle/80 border border-accent-subtle-border rounded-xl flex items-center gap-1.5 transition text-xs font-semibold cursor-pointer"
                  title="Scan with Mobile Camera"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Camera</span>
                </button>
              </form>

              {/* Medicine Autocomplete Search */}
              <div className="flex-1 relative">
                <SmartAutocomplete
                  placeholder="Search Medicine, Generic, Brand, Molecule, Barcode, HSN... (First char instant)"
                  hotkey="f1"
                  minChars={1}
                  clearOnSelect={true}
                  fetchResults={async (q, signal) => {
                    const res = await apiClient.get('/pos/search', {
                      params: { q, branchId: selectedBranchId },
                      signal,
                    });
                    const list = res.data?.data || res.data || [];
                    return list.map((med: any) => ({
                      id: med.id,
                      title: med.name,
                      subtitle: `${med.genericName || med.brandName || ''} • MFR: ${med.manufacturer || 'N/A'}`,
                      badge: med.availableStock > 0 ? `${med.availableStock} ${med.baseUnit}` : 'Out of stock',
                      metadata: med,
                    }));
                  }}
                  onSelect={(item) => {
                    if (item.metadata) {
                      handleAddSearchResult(item.metadata);
                    }
                  }}
                  renderItem={(item, isSelected, query) => {
                    const med = item.metadata || {};
                    return (
                      <div className="flex justify-between items-center gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-text-primary truncate">
                              <HighlightMatch text={med.name || item.title} query={query} />
                            </p>
                            {med.prescriptionRequired && (
                              <span className="px-1.5 py-0.2 rounded bg-status-error-bg text-status-error border border-status-error-border text-[9px] font-bold flex-shrink-0">
                                Rx ({med.drugSchedule || 'H'})
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted truncate">
                            <span className="text-accent font-mono">
                              <HighlightMatch text={med.genericName || med.brandName || 'Generics'} query={query} />
                            </span>{' '}
                            • MFR: {med.manufacturer}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
                            <span>
                              Batch: <strong className="text-accent">{med.fefoBatch?.batchNumber || 'Auto-FEFO'}</strong>
                            </span>
                            <span>
                              Exp: {med.fefoBatch?.expiryDate ? formatDate(med.fefoBatch.expiryDate, 'MM/YY') : 'N/A'}
                            </span>
                            <span>
                              Stock:{' '}
                              <strong className={med.availableStock > 5 ? 'text-status-success' : 'text-status-warning'}>
                                {med.availableStock} {med.baseUnit}
                              </strong>
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono font-bold text-accent">
                            ₹{Number(med.fefoBatch?.sellingPrice ?? med.defaultSellingPrice).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-text-disabled line-through">
                            MRP: ₹{Number(med.fefoBatch?.mrp ?? med.mrp).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                  inputClassName="!py-2 !text-xs !rounded-xl"
                />
              </div>
            </div>

            {/* Cart Table Container */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              {cart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted">
                    <ShoppingCart className="w-7 h-7 stroke-1" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">Cart is Empty</p>
                  <p className="text-xs text-text-muted max-w-sm text-center">
                    Scan barcode or search medicines to add items. FEFO batch is auto-selected.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                  <thead className="bg-surface-raised text-text-secondary font-semibold sticky top-0 z-10 uppercase tracking-wider text-[10px] border-b border-border">
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
                  <tbody className="divide-y divide-border/60">
                    {cart.items.map((item, idx) => {
                      const isSelected = cart.selectedItemIndex === idx;
                      return (
                        <tr
                          key={`${item.medicineId}-${item.batchId || idx}`}
                          onClick={() => cart.setSelectedItemIndex(idx)}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? 'bg-accent-subtle border-l-2 border-accent'
                              : 'hover:bg-surface-hover'
                          }`}
                        >
                          <td className="py-2 px-3 text-text-muted font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-text-primary flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.prescriptionRequired && (
                                <span className="px-1.5 py-0.2 rounded bg-status-error-bg border border-status-error-border text-status-error font-mono text-[9px] font-bold">
                                  Rx
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
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
                                className="px-1.5 py-0.2 rounded font-mono text-[10px] font-medium flex items-center gap-1 border border-border bg-surface-raised text-accent hover:bg-surface-hover transition"
                              >
                                <span>Batch: {item.batchNumber || 'Auto-FEFO'}</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                              <span className="text-text-disabled">MRP: ₹{item.mrp}</span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-right">
                            {canEditRate ? (
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={item.rate === 0 ? '' : item.rate}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  cart.updateItemRate(item.medicineId, val, item.batchId);
                                }}
                                className="w-20 px-1.5 py-0.5 text-right font-mono font-bold bg-accent-subtle border border-accent-subtle-border text-accent rounded text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                                title="Admin: Edit Rate on the fly"
                              />
                            ) : (
                              <span className="font-mono font-medium text-text-primary">
                                ₹{Number(item.rate || 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <select
                              value={item.unitLevel || 'TABLET'}
                              onChange={(e) => cart.updateItemUnitLevel(item.medicineId, e.target.value, item.batchId)}
                              className="px-1.5 py-0.5 bg-surface-base text-accent border border-border rounded font-semibold text-[10px] focus:outline-none"
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
                                className="w-6 h-6 rounded bg-surface-raised hover:bg-surface-hover border border-border flex items-center justify-center text-text-primary transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={item.qty === 0 ? '' : item.qty}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                  cart.updateItemQty(item.medicineId, val, item.batchId);
                                }}
                                className="w-11 text-center font-mono font-bold text-text-primary bg-surface-base border border-border rounded py-0.5 text-xs focus:outline-none focus:border-accent"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cart.incrementItemQty(idx);
                                }}
                                className="w-6 h-6 rounded bg-surface-raised hover:bg-surface-hover border border-border flex items-center justify-center text-text-primary transition cursor-pointer"
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
                              placeholder="0"
                              value={item.discountPercent === 0 ? '' : item.discountPercent}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                cart.updateItemDiscount(item.medicineId, val, item.batchId);
                              }}
                              className="w-12 text-right bg-surface-base border border-border rounded py-0.5 px-1 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                            />
                          </td>

                          <td className="py-2 px-3 text-right font-mono text-text-muted">
                            {item.taxPercent}%
                          </td>

                          <td className="py-2 px-3 text-right font-bold text-accent font-mono text-xs">
                            ₹{Number(item.lineTotal || 0).toFixed(2)}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cart.removeItem(item.medicineId, item.batchId);
                              }}
                              className="text-text-muted hover:text-status-error p-1 transition cursor-pointer"
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
            <div className="hidden lg:flex p-2 px-4 border-t border-border bg-surface-raised items-center justify-between text-[11px] text-text-muted">
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">F1</kbd> Search</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">F2</kbd> Customer</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">F4</kbd> Last Bill</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">F8</kbd> Hold</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">F9</kbd> Checkout</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-primary">+/-</kbd> Qty</span>
              </div>
              <span className="text-accent font-mono text-[10px]">{cart.items.length} items</span>
            </div>
          </div>

          {/* RIGHT: Customer, Payment & Checkout Panel */}
          <div
            className={`w-full lg:w-96 bg-surface-base rounded-2xl border border-border shadow-sm flex flex-col p-4 gap-4 justify-between ${
              mobileTab === 'payment' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="space-y-3.5">
              {/* Customer Quick Card */}
              <div className="p-3 rounded-xl border border-border bg-surface-raised space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                    <Users className="w-4 h-4 text-accent" />
                    <span>Customer</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition font-medium cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ New (F2)</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <SmartAutocomplete
                    placeholder="Search or Enter Patient Mobile / Name..."
                    hotkey="f2"
                    minChars={1}
                    value={cart.customer?.mobile ? `${cart.customer.name} (${cart.customer.mobile})` : cart.customer?.name || ''}
                    fetchResults={async (q, signal) => {
                      const res = await apiClient.get('/search/customers', {
                        params: { q, limit: 10 },
                        signal,
                      });
                      const list = res.data || [];
                      return list.map((c: any) => ({
                        id: c.id,
                        title: c.name,
                        subtitle: c.mobile ? `📱 ${c.mobile} ${c.address ? `• ${c.address}` : ''}` : 'No phone',
                        badge: c.currentBalance > 0 ? `Due ₹${c.currentBalance}` : undefined,
                        metadata: c,
                      }));
                    }}
                    onSelect={(item) => {
                      const c = item.metadata;
                      if (c) {
                        cart.setCustomer({
                          id: c.id,
                          name: c.name,
                          mobile: c.mobile || '',
                          gstNumber: c.gstNumber || '',
                          creditLimit: c.creditLimit || 0,
                          currentBalance: c.currentBalance || 0,
                        });
                      }
                    }}
                    onClear={() => {
                      cart.setCustomer({
                        name: 'Walk-in Customer',
                        mobile: '',
                      });
                    }}
                    createNewAction={{
                      label: 'Create Patient',
                      onClick: (val) => {
                        if (/^\d+$/.test(val.trim())) {
                          setNewCustomer((prev) => ({ ...prev, mobile: val.trim() }));
                        } else {
                          setNewCustomer((prev) => ({ ...prev, name: val.trim() }));
                        }
                        setShowCustomerModal(true);
                      },
                    }}
                    inputClassName="!py-1.5 !text-xs !rounded-lg"
                  />

                  {/* Editable Fields */}
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
                      className="px-2.5 py-1.5 bg-surface-base border border-border rounded-lg text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent"
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
                      className="px-2.5 py-1.5 bg-surface-base border border-border rounded-lg text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {cart.customer?.creditLimit ? (
                  <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-border">
                    <span className="text-text-muted">
                      Balance: <strong className="text-status-warning">₹{cart.customer.currentBalance || 0}</strong>
                    </span>
                    <span className="text-text-muted">
                      Limit: <strong className="text-accent">₹{cart.customer.creditLimit}</strong>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Payment Mode Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-primary">Payment Mode</label>
                  <button
                    type="button"
                    onClick={() => setShowSplitPaymentModal(true)}
                    className="text-[10px] text-accent hover:text-accent-hover font-mono transition cursor-pointer"
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
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold gap-1 transition cursor-pointer ${
                          isSelected
                            ? 'bg-accent text-accent-foreground border-accent shadow-sm font-bold'
                            : 'bg-surface-raised text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary'
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
                <div className="p-3 rounded-xl border border-border bg-surface-raised space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-secondary font-medium">Cash Tendered:</span>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={cart.receivedCash || ''}
                      onChange={(e) => cart.setReceivedCash(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-surface-base border border-border rounded text-text-primary text-xs focus:outline-none focus:border-accent"
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
                        className="py-1 px-1.5 rounded-lg border border-border bg-surface-base text-[10px] font-mono text-text-primary font-semibold hover:bg-surface-hover transition cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border text-xs">
                    <span className="text-text-primary font-semibold">Change to Return:</span>
                    <span className="font-mono font-bold text-status-success text-sm">
                      {formatCurrency(cart.getChangeAmount())}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Summary & Primary Checkout */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Items Subtotal:</span>
                <span className="font-mono font-medium text-text-primary">₹{cart.getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Discount Total:</span>
                <span className="font-mono text-status-success font-semibold">-₹{cart.getDiscountTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Tax / GST:</span>
                <span className="font-mono font-medium text-text-primary">₹{cart.getTaxTotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <span className="font-bold text-text-primary text-sm">TOTAL PAYABLE:</span>
                <span className="text-2xl font-extrabold text-text-primary font-mono tracking-tight">
                  ₹{cart.getGrandTotal().toFixed(2)}
                </span>
              </div>

              <button
                disabled={cart.items.length === 0 || isCheckingOut}
                onClick={handleCheckoutClick}
                className="w-full mt-3 py-3.5 bg-status-success hover:opacity-90 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-40 disabled:pointer-events-none shadow-md"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface-overlay max-w-lg w-full p-5 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Select Batch</h3>
                  <p className="text-[10px] text-accent font-mono">{batchModalItem.medicineName}</p>
                </div>
                <button
                  onClick={() => setBatchModalItem(null)}
                  className="p-1 text-text-muted hover:text-text-primary transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {medicineBatches.length === 0 ? (
                  <p className="text-text-muted text-center py-6">No alternative active batches found.</p>
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
                          isSelected
                            ? 'bg-accent-subtle border-accent'
                            : 'bg-surface-base border-border hover:border-border-strong hover:bg-surface-hover'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-text-primary">{b.batchNumber}</span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-accent-subtle text-accent font-mono text-[9px] font-bold">
                                FEFO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted font-mono">
                            Exp: {formatDate(b.expiryDate, 'MM/YY')} • Stock: {b.currentQty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-accent text-xs">₹{b.sellingPrice}</p>
                          <p className="text-[10px] text-text-disabled line-through">MRP: ₹{b.mrp}</p>
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface-overlay max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-accent">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Cashier Register &amp; Shift</h3>
                </div>
                <button
                  onClick={() => setShowShiftModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {currentShift ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
                      <p className="text-text-muted text-[10px]">Opening Float</p>
                      <p className="text-sm font-bold text-text-primary">₹{currentShift.openingCash}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
                      <p className="text-text-muted text-[10px]">Cash Sales</p>
                      <p className="text-sm font-bold text-status-success">₹{currentShift.totalCashSales}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
                      <p className="text-text-muted text-[10px]">UPI / Digital Sales</p>
                      <p className="text-sm font-bold text-accent">₹{currentShift.totalUpiSales + currentShift.totalCardSales}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
                      <p className="text-text-muted text-[10px]">Expected Cash</p>
                      <p className="text-sm font-bold text-status-warning">₹{currentShift.expectedCash}</p>
                    </div>
                  </div>

                  <form onSubmit={handleCloseShift} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Physical Cash Counted in Drawer (₹) *
                      </label>
                      <input
                        required
                        type="number"
                        onFocus={(e) => e.target.select()}
                        step="0.01"
                        placeholder="Counted cash amount"
                        value={closingCashInput}
                        onChange={(e) => setClosingCashInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-sm text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShiftModal(false)}
                        className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:bg-surface-hover transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-status-error hover:opacity-90 font-bold text-white shadow-sm transition cursor-pointer"
                      >
                        Close &amp; Finalize Shift
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleOpenShift} className="space-y-4">
                  <p className="text-text-muted text-xs">
                    Start a cashier shift by entering the opening cash drawer float amount.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Opening Cash Float (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      onFocus={(e) => e.target.select()}
                      step="0.01"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowShiftModal(false)}
                      className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:bg-surface-hover transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover font-bold text-white shadow-sm transition cursor-pointer"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface-overlay max-w-xl w-full p-6 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-accent">
                  <PauseCircle className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Held Carts &amp; Suspended Bills</h3>
                </div>
                <button
                  onClick={() => setShowHeldModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {heldCartsList.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <PauseCircle className="w-10 h-10 mx-auto stroke-1 mb-2 opacity-50" />
                    <p>No active suspended bills.</p>
                  </div>
                ) : (
                  heldCartsList.map((held: any) => (
                    <div
                      key={held.id}
                      className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between hover:border-border-strong transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-accent">{held.code}</span>
                          <span className="font-semibold text-text-primary">{held.name}</span>
                        </div>
                        <p className="text-[10px] text-text-muted font-mono">
                          {held.itemCount} items • {new Date(held.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-text-primary">
                          ₹{held.totalAmount?.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleResumeHeldCart(held.id)}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg font-bold text-[11px] flex items-center gap-1 text-white cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleDeleteHeldCart(held.id)}
                          className="p-1.5 text-text-muted hover:text-status-error cursor-pointer"
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

        {/* Modal 3.5: Split Payment */}
        {showSplitPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-overlay rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-accent">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Multi-Mode Split Payment</h3>
                </div>
                <button
                  onClick={() => setShowSplitPaymentModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-surface-raised rounded-xl border border-border flex justify-between items-center font-mono">
                <span className="text-text-secondary text-xs font-sans">Total Bill Payable:</span>
                <span className="text-lg font-bold text-text-primary">
                  ₹{cart.getGrandTotal().toFixed(2)}
                </span>
              </div>

              <div className="space-y-3">
                {splitPaymentRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={row.mode}
                      onChange={(e) => {
                        const updated = [...splitPaymentRows];
                        updated[idx].mode = e.target.value as PaymentMode;
                        setSplitPaymentRows(updated);
                      }}
                      className="px-2.5 py-1.5 bg-surface-base border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                    >
                      <option value={PaymentMode.CASH}>Cash</option>
                      <option value={PaymentMode.UPI}>UPI / QR</option>
                      <option value={PaymentMode.CARD}>Card</option>
                      <option value={PaymentMode.CREDIT}>Credit / Ledger</option>
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={row.amount === 0 ? '' : row.amount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const updated = [...splitPaymentRows];
                        updated[idx].amount = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        setSplitPaymentRows(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-surface-base border border-border rounded-xl text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                    />

                    {splitPaymentRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSplitPaymentRows(splitPaymentRows.filter((_, i) => i !== idx))}
                        className="p-1.5 text-status-error hover:bg-status-error-bg rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const allocated = splitPaymentRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
                    const remaining = Math.max(0, Number((cart.getGrandTotal() - allocated).toFixed(2)));
                    setSplitPaymentRows([...splitPaymentRows, { mode: PaymentMode.UPI, amount: remaining }]);
                  }}
                  className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  + Add Split Payment Row
                </button>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="text-xs">
                  <span className="text-text-muted">Allocated: </span>
                  <strong
                    className={`font-mono ${
                      Math.abs(
                        splitPaymentRows.reduce((sum, r) => sum + Number(r.amount || 0), 0) - cart.getGrandTotal()
                      ) < 0.05
                        ? 'text-status-success'
                        : 'text-status-warning'
                    }`}
                  >
                    ₹{splitPaymentRows.reduce((sum, r) => sum + Number(r.amount || 0), 0).toFixed(2)}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSplitPaymentModal(false)}
                    className="px-3.5 py-1.5 bg-surface-raised text-text-secondary hover:bg-surface-hover rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allocated = splitPaymentRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
                      const grand = cart.getGrandTotal();
                      if (Math.abs(allocated - grand) > 0.05) {
                        alert(`Split amount total (₹${allocated.toFixed(2)}) must equal Total Bill (₹${grand.toFixed(2)})`);
                        return;
                      }
                      cart.setPayments(splitPaymentRows.map((r) => ({ paymentMode: r.mode, amount: Number(r.amount) })));
                      setShowSplitPaymentModal(false);
                      alert('Split payment configured successfully.');
                    }}
                    className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl shadow cursor-pointer transition"
                  >
                    Apply Split
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 4: Quick Add Customer */}
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface-overlay max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-accent">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Quick Add Customer</h3>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickAddCustomer} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Customer / Patient Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="9876543210"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      value={newCustomer.creditLimit || ''}
                      onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="29AAAAA0000A1Z5"
                      value={newCustomer.gstNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:bg-surface-hover cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover font-bold text-white shadow-sm transition cursor-pointer"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface-overlay max-w-2xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-status-warning">
                  <RotateCcw className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Sales Return &amp; Refund</h3>
                </div>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                >
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
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-base border border-border text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover font-bold text-white text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Lookup
                </button>
              </form>

              {returnInvoiceData && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-surface-raised border border-border flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-text-primary font-mono">{returnInvoiceData.invoiceNumber}</p>
                      <p className="text-[10px] text-text-muted">
                        Date: {formatDate(returnInvoiceData.createdAt)} • Customer: {returnInvoiceData.customer?.name || 'Walk-in'}
                      </p>
                    </div>
                    <span className="font-bold font-mono text-accent">
                      Total: ₹{returnInvoiceData.totalAmount}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {returnInvoiceData.items.map((it: any) => {
                      const state = returnItemsState[it.id] || { returnQty: 0, condition: 'RESALABLE', reason: '' };
                      return (
                        <div
                          key={it.id}
                          className="p-3 rounded-xl border border-border bg-surface-base flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-text-primary">{it.medicine?.name}</p>
                            <p className="text-[10px] text-text-muted font-mono">
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
                              className="px-2 py-1 bg-surface-raised text-accent border border-border rounded-lg text-[10px] focus:outline-none"
                            >
                              <option value="RESALABLE">Resalable</option>
                              <option value="DAMAGED">Damaged</option>
                              <option value="EXPIRED">Expired</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-text-muted">Qty:</span>
                              <input
                                type="number"
                                onFocus={(e) => e.target.select()}
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
                                className="w-12 px-1.5 py-1 text-center bg-surface-base border border-border rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs">Refund Mode:</span>
                      <select
                        value={returnRefundMode}
                        onChange={(e) => setReturnRefundMode(e.target.value as PaymentMode)}
                        className="px-2 py-1 bg-surface-base text-text-primary border border-border rounded-lg text-xs focus:outline-none"
                      >
                        <option value={PaymentMode.CASH}>Cash</option>
                        <option value={PaymentMode.UPI}>UPI</option>
                        <option value={PaymentMode.CREDIT}>Credit / Ledger</option>
                      </select>
                    </div>
                    <button
                      disabled={isProcessingReturn}
                      onClick={handleProcessReturn}
                      className="px-5 py-2.5 rounded-xl bg-status-warning hover:opacity-90 text-white font-bold text-xs shadow-sm transition cursor-pointer"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rounded-2xl border border-status-error-border bg-surface-overlay max-w-lg w-full p-6 space-y-4 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-status-error">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-text-primary">Schedule H Prescription Required</h3>
                </div>
                <button
                  onClick={() => setShowRxModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRxSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Doctor Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Dr. R. Sharma"
                      value={prescriptionForm.doctorName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Doctor Reg No *</label>
                    <input
                      required
                      type="text"
                      placeholder="MCI-19842"
                      value={prescriptionForm.doctorRegNo}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorRegNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Patient Name *</label>
                    <input
                      required
                      type="text"
                      value={prescriptionForm.patientName || cart.customer?.name || ''}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Patient Age *</label>
                    <input
                      required
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min="1"
                      value={prescriptionForm.patientAge}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientAge: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-base border border-border font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowRxModal(false)}
                    className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:bg-surface-hover cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="px-5 py-2 rounded-xl bg-status-success hover:opacity-90 font-bold text-white shadow-sm transition cursor-pointer"
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
                className="px-4 py-2.5 bg-status-success hover:opacity-90 text-white font-bold rounded-2xl shadow-2xl flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                Share Receipt on WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Modal 8: Mobile Camera Barcode Scanner */}
        {showCameraScanner && (
          <CameraBarcodeScanner
            onScanSuccess={handleDirectCodeScan}
            onClose={() => {
              setShowCameraScanner(false);
              barcodeRef.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}
