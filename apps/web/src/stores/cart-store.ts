import { create } from 'zustand';
import { PaymentMode, PaperWidth } from '@medical-inventory/shared-types';
import { calculateLineTotal, roundToDecimals } from '@medical-inventory/shared-utils';

export interface CartItem {
  medicineId: string;
  name: string;
  sku: string;
  dosageForm?: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
  unitLevel?: string;
  qty: number;
  rate: number;
  mrp: number;
  taxPercent: number;
  discountPercent: number;
  availableStock?: number;
  prescriptionRequired?: boolean;
  lineTotal: number;
}

export interface PaymentSplit {
  paymentMode: PaymentMode;
  amount: number;
  referenceNumber?: string;
}

interface CartState {
  items: CartItem[];
  customer: {
    id?: string;
    name?: string;
    mobile?: string;
  } | null;
  payments: PaymentSplit[];
  invoiceDiscountPercent: number;
  paperWidth: PaperWidth;
  notes: string;

  // Actions
  addItem: (item: Omit<CartItem, 'lineTotal'>) => void;
  setItems: (items: CartItem[]) => void;
  updateItemQty: (medicineId: string, qty: number, batchId?: string) => void;
  updateItemDiscount: (medicineId: string, discountPercent: number, batchId?: string) => void;
  updateItemRate: (medicineId: string, rate: number, batchId?: string) => void;
  updateItemUnitLevel: (medicineId: string, unitLevel: string, batchId?: string) => void;
  removeItem: (medicineId: string, batchId?: string) => void;
  clearCart: () => void;
  setCustomer: (customer: { id?: string; name?: string; mobile?: string } | null) => void;
  setInvoiceDiscount: (percent: number) => void;
  setPaperWidth: (width: PaperWidth) => void;
  setNotes: (notes: string) => void;
  setPayments: (payments: PaymentSplit[]) => void;
  addPayment: (payment: PaymentSplit) => void;
  removePayment: (index: number) => void;

  // Computed Totals
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
  getTotalPaid: () => number;
  getBalanceDue: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  payments: [{ paymentMode: PaymentMode.CASH, amount: 0 }],
  invoiceDiscountPercent: 0,
  paperWidth: PaperWidth.WIDTH_58MM,
  notes: '',

  setItems: (items) => {
    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },

  addItem: (item) => {
    const { items, getGrandTotal } = get();
    const existingIndex = items.findIndex(
      (i) => i.medicineId === item.medicineId && i.batchId === item.batchId
    );

    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      const existing = items[existingIndex]!;
      const newQty = existing.qty + item.qty;
      const line = calculateLineTotal(
        newQty,
        existing.rate,
        existing.discountPercent,
        existing.taxPercent
      );

      updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        qty: newQty,
        lineTotal: line.total,
      };
    } else {
      const line = calculateLineTotal(
        item.qty,
        item.rate,
        item.discountPercent,
        item.taxPercent
      );
      updatedItems = [...items, { ...item, lineTotal: line.total }];
    }

    set({ items: updatedItems });

    // Auto-update first cash payment to match grand total
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },

  updateItemQty: (medicineId, qty, batchId) => {
    if (qty <= 0) {
      get().removeItem(medicineId, batchId);
      return;
    }

    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateLineTotal(qty, item.rate, item.discountPercent, item.taxPercent);
        return { ...item, qty, lineTotal: line.total };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },

  updateItemDiscount: (medicineId, discountPercent, batchId) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateLineTotal(item.qty, item.rate, discountPercent, item.taxPercent);
        return { ...item, discountPercent, lineTotal: line.total };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },

  updateItemRate: (medicineId, rate, batchId) => {
    const items = get().items.map((item) => {
      if (item.medicineId === medicineId && (!batchId || item.batchId === batchId)) {
        const line = calculateLineTotal(item.qty, rate, item.discountPercent, item.taxPercent);
        return { ...item, rate, lineTotal: line.total };
      }
      return item;
    });

    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
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
    set({ items });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      payments: [{ paymentMode: PaymentMode.CASH, amount: 0 }],
      invoiceDiscountPercent: 0,
      notes: '',
    });
  },

  setCustomer: (customer) => set({ customer }),
  setInvoiceDiscount: (invoiceDiscountPercent) => {
    set({ invoiceDiscountPercent });
    const total = get().getGrandTotal();
    set({ payments: [{ paymentMode: PaymentMode.CASH, amount: total }] });
  },
  setPaperWidth: (paperWidth) => set({ paperWidth }),
  setNotes: (notes) => set({ notes }),
  setPayments: (payments) => set({ payments }),

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
      const line = calculateLineTotal(item.qty, item.rate, item.discountPercent, item.taxPercent);
      return sum + line.discountAmount;
    }, 0);

    const subtotal = get().getSubtotal();
    const invoiceDiscount = (subtotal * invoiceDiscountPercent) / 100;
    return roundToDecimals(itemDiscounts + invoiceDiscount);
  },

  getTaxTotal: () => {
    return roundToDecimals(
      get().items.reduce((sum, item) => {
        const line = calculateLineTotal(item.qty, item.rate, item.discountPercent, item.taxPercent);
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
}));
