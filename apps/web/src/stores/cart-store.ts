import { create } from 'zustand';
import { PaymentMode, PaperWidth } from '@medical-inventory/shared-types';
import {
  calculateDetailedLineTotal,
  calculateCashChange,
  roundToDecimals,
  calculateRoundOff,
  RoundOffMode,
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
  baseRate: number;
  stripsPerBox?: number;
  tabletsPerStrip?: number;
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
  roundOffMode: RoundOffMode;
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
  setRoundOffMode: (mode: RoundOffMode) => void;
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
  getRawTotal: () => number;
  getRoundOffAmount: () => number;
  getGrandTotal: () => number;
  getTotalPaid: () => number;
  getBalanceDue: () => number;
  getChangeAmount: () => number;
}

function getUnitMultiplier(unitLevel?: string, stripsPerBox = 10, tabletsPerStrip = 10): number {
  if (unitLevel === 'STRIP') return tabletsPerStrip || 10;
  if (unitLevel === 'BOX') return (stripsPerBox || 10) * (tabletsPerStrip || 10);
  return 1; // TABLET / PIECE / BASE
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  payments: [{ paymentMode: PaymentMode.CASH, amount: 0 }],
  invoiceDiscountPercent: 0,
  roundOffMode: 'floor',
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

    const baseRate = item.baseRate || item.rate;
    const multiplier = getUnitMultiplier(item.unitLevel, item.stripsPerBox, item.tabletsPerStrip);
    const rate = item.rate || Number((baseRate * multiplier).toFixed(2));

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
        rate,
        item.discountPercent || 0,
        item.taxPercent || 0
      );
      updatedItems = [
        ...items,
        {
          ...item,
          baseRate,
          rate,
          unitLevel: item.unitLevel || 'STRIP',
          lineTotal: line.lineTotal,
        },
      ];
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
        const baseRate = newBatch.sellingPrice || item.baseRate || item.rate;
        const mult = getUnitMultiplier(item.unitLevel, item.stripsPerBox, item.tabletsPerStrip);
        const rate = Number((baseRate * mult).toFixed(2));
        const line = calculateDetailedLineTotal(item.qty, rate, item.discountPercent, newBatch.taxPercent || item.taxPercent);
        return {
          ...item,
          baseRate,
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
        const mult = getUnitMultiplier(item.unitLevel, item.stripsPerBox, item.tabletsPerStrip);
        const baseRate = mult > 0 ? Number((rate / mult).toFixed(2)) : rate;
        const line = calculateDetailedLineTotal(item.qty, rate, item.discountPercent, item.taxPercent);
        return { ...item, rate, baseRate, lineTotal: line.lineTotal };
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
        const mult = getUnitMultiplier(unitLevel, item.stripsPerBox, item.tabletsPerStrip);
        const baseRate = item.baseRate || item.rate;
        const rate = Number((baseRate * mult).toFixed(2));
        const line = calculateDetailedLineTotal(item.qty, rate, item.discountPercent, item.taxPercent);
        return { ...item, unitLevel, rate, lineTotal: line.lineTotal };
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

  removeItem: (medicineId, batchId) => {
    const items = get().items.filter(
      (item) => !(item.medicineId === medicineId && (!batchId || item.batchId === batchId))
    );
    const selectedItemIndex = Math.min(get().selectedItemIndex, Math.max(0, items.length - 1));
    set({ items, selectedItemIndex });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },

  removeSelectedItem: () => {
    const { items, selectedItemIndex } = get();
    if (items.length === 0 || !items[selectedItemIndex]) return;
    const target = items[selectedItemIndex]!;
    get().removeItem(target.medicineId, target.batchId);
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
  setRoundOffMode: (roundOffMode) => {
    set({ roundOffMode });
    const total = get().getGrandTotal();
    set({
      payments: [{ paymentMode: PaymentMode.CASH, amount: total }],
      receivedCash: total,
    });
  },
  setPaperWidth: (paperWidth) => set({ paperWidth }),
  setNotes: (notes) => set({ notes }),

  setPayments: (payments) => {
    set({ payments });
  },

  addPayment: (payment) => {
    set({ payments: [...get().payments, payment] });
  },

  removePayment: (index) => {
    const payments = get().payments.filter((_, idx) => idx !== index);
    set({ payments });
  },

  setReceivedCash: (receivedCash) => set({ receivedCash }),
  setSelectedItemIndex: (selectedItemIndex) => set({ selectedItemIndex }),

  // Computed Totals
  getSubtotal: () => {
    const total = get().items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    return roundToDecimals(total);
  },

  getDiscountTotal: () => {
    const itemDisc = get().items.reduce(
      (sum, item) => sum + (item.qty * item.rate * item.discountPercent) / 100,
      0
    );
    const sub = get().getSubtotal();
    const invDisc = (sub * get().invoiceDiscountPercent) / 100;
    return roundToDecimals(itemDisc + invDisc);
  },

  getTaxTotal: () => {
    const total = get().items.reduce((sum, item) => {
      const taxable = item.qty * item.rate * (1 - item.discountPercent / 100);
      return sum + (taxable * item.taxPercent) / 100;
    }, 0);
    return roundToDecimals(total);
  },

  getRawTotal: () => {
    const itemsTotal = get().items.reduce((sum, item) => sum + item.lineTotal, 0);
    if (get().invoiceDiscountPercent > 0) {
      const invDisc = (itemsTotal * get().invoiceDiscountPercent) / 100;
      return Math.max(0, roundToDecimals(itemsTotal - invDisc));
    }
    return roundToDecimals(itemsTotal);
  },

  getRoundOffAmount: () => {
    const raw = get().getRawTotal();
    const mode = get().roundOffMode || 'floor';
    return calculateRoundOff(raw, mode).roundOffAmount;
  },

  getGrandTotal: () => {
    const raw = get().getRawTotal();
    const mode = get().roundOffMode || 'floor';
    return calculateRoundOff(raw, mode).roundedTotal;
  },

  getTotalPaid: () => {
    const total = get().payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return roundToDecimals(total);
  },

  getBalanceDue: () => {
    const grand = get().getGrandTotal();
    const paid = get().getTotalPaid();
    return Math.max(0, roundToDecimals(grand - paid));
  },

  getChangeAmount: () => {
    const grand = get().getGrandTotal();
    const received = get().receivedCash || 0;
    return Math.max(0, roundToDecimals(received - grand));
  },
}));
