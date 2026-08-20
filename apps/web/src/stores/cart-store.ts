import { create } from 'zustand';
import { PaymentMode, PaperWidth } from '@medical-inventory/shared-types';
import {
  calculateDetailedLineTotal,
  calculateCashChange,
  roundToDecimals,
} from '@medical-inventory/shared-utils';

export interface BatchOption {
  id: string;
  batchNumber: string;
  mfgDate: string | Date;
  expiryDate: string | Date;
  mrp: number;
  sellingPrice: number;
  currentQty: number;
  taxPercent: number;
}

export interface CartItem {
  medicineId: string;
  name: string;
  genericName?: string;
  sku: string;
  barcode?: string;
  hsnCode?: string;
  dosageForm?: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
  unitLevel?: string; // 'BOX' | 'STRIP' | 'TABLET'
  qty: number;
  rate: number;
  mrp: number;
  taxPercent: number;
  discountPercent: number;
  availableStock?: number;
  prescriptionRequired?: boolean;
  drugSchedule?: string;
  lineTotal: number;
  batches?: BatchOption[];
}

export interface PaymentSplit {
  paymentMode: PaymentMode;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  customer: {
    id?: string;
    name?: string;
    mobile?: string;
    gstNumber?: string;
    creditLimit?: number;
    currentBalance?: number;
  } | null;
  payments: PaymentSplit[];
  invoiceDiscountPercent: number;
  paperWidth: PaperWidth;
  notes: string;
  receivedCash: number;
  selectedItemIndex: number;

  // Actions
  addItem: (item: Omit<CartItem, 'lineTotal'>) => void;
  scanBarcodeItem: (item: Omit<CartItem, 'lineTotal'>) => void;
  setItems: (items: CartItem[]) => void;
  updateItemQty: (medicineId: string, qty: number, batchId?: string) => void;
  incrementItemQty: (index: number) => void;
  decrementItemQty: (index: number) => void;
  updateItemDiscount: (medicineId: string, discountPercent: number, batchId?: string) => void;
  updateItemRate: (medicineId: string, rate: number, batchId?: string) => void;
  updateItemUnitLevel: (medicineId: string, unitLevel: string, batchId?: string) => void;
  switchItemBatch: (medicineId: string, oldBatchId: string | undefined, newBatch: BatchOption) => void;
  removeItem: (medicineId: string, batchId?: string) => void;
  removeSelectedItem: () => void;
  clearCart: () => void;
  setCustomer: (customer: CartState['customer']) => void;
  setInvoiceDiscount: (percent: number) => void;
  setPaperWidth: (width: PaperWidth) => void;
  setNotes: (notes: string) => void;
  setPayments: (payments: PaymentSplit[]) => void;
  addPayment: (payment: PaymentSplit) => void;
  removePayment: (index: number) => void;
  setReceivedCash: (amount: number) => void;
  setSelectedItemIndex: (index: number) => void;

  // Computed Totals
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
  getTotalPaid: () => number;
  getBalanceDue: () => number;
  getChangeAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  payments: [{ paymentMode: PaymentMode.CASH, amount: 0 }],
  invoiceDiscountPercent: 0,
  paperWidth: PaperWidth.WIDTH_58MM,
  notes: '',
  receivedCash: 0,
  selectedItemIndex: 0,

  setItems: (items) => {
    set({ items, selectedItemIndex: Math.min(get().selectedItemIndex, items.length - 1) });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  addItem: (item) => {
    const { items } = get();
    const existingIndex = items.findIndex(
      (i) => i.medicineId === item.medicineId && i.batchId === item.batchId
    );

    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      const existing = items[existingIndex]!;
      const newQty = existing.qty + (item.qty || 1);
      const line = calculateDetailedLineTotal(
        newQty,
        existing.rate,
        existing.discountPercent,
        existing.taxPercent
      );

      updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        qty: newQty,
        lineTotal: line.lineTotal,
      };
      set({ selectedItemIndex: existingIndex });
    } else {
      const line = calculateDetailedLineTotal(
        item.qty || 1,
        item.rate,
        item.discountPercent || 0,
        item.taxPercent || 0
      );
      updatedItems = [...items, { ...item, lineTotal: line.lineTotal }];
      set({ selectedItemIndex: updatedItems.length - 1 });
    }

    set({ items: updatedItems });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  scanBarcodeItem: (item) => {
    const { items } = get();
    // Check if matching medicine (or barcode) is already in cart
    const existingIndex = items.findIndex(
      (i) => i.medicineId === item.medicineId && (item.batchId ? i.batchId === item.batchId : true)
    );

    if (existingIndex > -1) {
      const existing = items[existingIndex]!;
      const newQty = existing.qty + 1;
      const line = calculateDetailedLineTotal(
        newQty,
        existing.rate,
        existing.discountPercent,
        existing.taxPercent
      );

      const updated = [...items];
      updated[existingIndex] = { ...existing, qty: newQty, lineTotal: line.lineTotal };
      set({ items: updated, selectedItemIndex: existingIndex });
    } else {
      get().addItem(item);
    }

    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  updateItemQty: (medicineId, qty, batchId) => {
    if (qty <= 0) {
      get().removeItem(medicineId, batchId);
      return;
    }

    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateDetailedLineTotal(qty, item.rate, item.discountPercent, item.taxPercent);
        return { ...item, qty, lineTotal: line.lineTotal };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  incrementItemQty: (index: number) => {
    const items = [...get().items];
    if (!items[index]) return;
    const item = items[index];
    const newQty = item.qty + 1;
    const line = calculateDetailedLineTotal(newQty, item.rate, item.discountPercent, item.taxPercent);
    items[index] = { ...item, qty: newQty, lineTotal: line.lineTotal };
    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }], receivedCash: total });
  },

  decrementItemQty: (index: number) => {
    const items = [...get().items];
    if (!items[index]) return;
    const item = items[index];
    if (item.qty <= 1) {
      get().removeItem(item.medicineId, item.batchId);
      return;
    }
    const newQty = item.qty - 1;
    const line = calculateDetailedLineTotal(newQty, item.rate, item.discountPercent, item.taxPercent);
    items[index] = { ...item, qty: newQty, lineTotal: line.lineTotal };
    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }], receivedCash: total });
  },

  switchItemBatch: (medicineId, oldBatchId, newBatch) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!oldBatchId || item.batchId === oldBatchId)) {
        const rate = newBatch.sellingPrice || item.rate;
        const line = calculateDetailedLineTotal(item.qty, rate, item.discountPercent, newBatch.taxPercent || item.taxPercent);
        return {
          ...item,
          batchId: newBatch.id,
          batchNumber: newBatch.batchNumber,
          expiryDate: typeof newBatch.expiryDate === 'string' ? newBatch.expiryDate : new Date(newBatch.expiryDate).toISOString().slice(0, 10),
          mrp: newBatch.mrp,
          rate,
          taxPercent: newBatch.taxPercent,
          lineTotal: line.lineTotal,
        };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  updateItemDiscount: (medicineId, discountPercent, batchId) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateDetailedLineTotal(item.qty, item.rate, discountPercent, item.taxPercent);
        return { ...item, discountPercent, lineTotal: line.lineTotal };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  updateItemRate: (medicineId, rate, batchId) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateDetailedLineTotal(item.qty, rate, item.discountPercent, item.taxPercent);
        return { ...item, rate, lineTotal: line.lineTotal };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  updateItemUnitLevel: (medicineId, unitLevel, batchId) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        return { ...item, unitLevel };
      }
      return item;
    });

    set({ items });
  },

  removeItem: (medicineId, batchId) => {
    const items = get().items.filter(
      (item) => !(item.medicineId === medicineId && (!batchId || item.batchId === batchId))
    );
    set({ items, selectedItemIndex: Math.max(0, items.length - 1) });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  removeSelectedItem: () => {
    const { items, selectedItemIndex } = get();
    if (items[selectedItemIndex]) {
      const item = items[selectedItemIndex];
      get().removeItem(item.medicineId, item.batchId);
    }
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      payments: [{ paymentMode: PaymentMode.CASH, amount: 0 }],
      invoiceDiscountPercent: 0,
      notes: '',
      receivedCash: 0,
      selectedItemIndex: 0,
    });
  },

  setCustomer: (customer) => set({ customer }),
  setInvoiceDiscount: (invoiceDiscountPercent) => {
    set({ invoiceDiscountPercent });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },
  setPaperWidth: (paperWidth) => set({ paperWidth }),
  setNotes: (notes) => set({ notes }),
  setPayments: (payments) => set({ payments }),
  setReceivedCash: (receivedCash) => set({ receivedCash }),
  setSelectedItemIndex: (selectedItemIndex) => set({ selectedItemIndex }),

  addPayment: (payment) => {
    set({ payments: [...get().payments, payment] });
  },

  removePayment: (index) => {
    const payments = get().payments.filter((_, i) => i !== index);
    set({ payments });
  },

  getSubtotal: () => {
    return roundToDecimals(
      get().items.reduce((sum, item) => sum + item.qty * item.rate, 0)
    );
  },

  getDiscountTotal: () => {
    const { items, invoiceDiscountPercent } = get();
    const itemDiscounts = items.reduce((sum, item) => {
      const line = calculateDetailedLineTotal(item.qty, item.rate, item.discountPercent, item.taxPercent);
      return sum + line.discountAmount;
    }, 0);

    const subtotal = get().getSubtotal();
    const invoiceDiscount = (subtotal * invoiceDiscountPercent) / 100;
    return roundToDecimals(itemDiscounts + invoiceDiscount);
  },

  getTaxTotal: () => {
    return roundToDecimals(
      get().items.reduce((sum, item) => {
        const line = calculateDetailedLineTotal(item.qty, item.rate, item.discountPercent, item.taxPercent);
        return sum + line.taxAmount;
      }, 0)
    );
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountTotal();
    const tax = get().getTaxTotal();
    return roundToDecimals(Math.max(0, subtotal - discount + tax));
  },

  getTotalPaid: () => {
    return roundToDecimals(
      get().payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    );
  },

  getBalanceDue: () => {
    const grand = get().getGrandTotal();
    const paid = get().getTotalPaid();
    return roundToDecimals(Math.max(0, grand - paid));
  },

  getChangeAmount: () => {
    const grand = get().getGrandTotal();
    const cash = get().receivedCash;
    return calculateCashChange(grand, cash).changeAmount;
  },
}));
