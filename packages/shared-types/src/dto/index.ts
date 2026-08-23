import {
  PaymentMode,
  DosageForm,
  BatchStatus,
  StockMovementType,
  ReturnCondition,
  PaperWidth,
} from '../enums/index.js';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface LoginDto {
  email?: string;
  mobile?: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    branches?: Array<{ id: string; name: string; code: string; isDefault?: boolean }>;
    primaryBranchId?: string | null;
  };
}

export interface CartItemDto {
  medicineId: string;
  batchId?: string;
  qty: number;
  unitId?: string;
  rate?: number;
  discountPercent?: number;
}

export interface CheckoutDto {
  branchId: string;
  customerId?: string;
  customerMobile?: string;
  customerName?: string;
  items: CartItemDto[];
  payments: {
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber?: string;
  }[];
  invoiceDiscountPercent?: number;
  notes?: string;
  paperWidth?: PaperWidth;
}

export interface CreatePurchaseDto {
  supplierId: string;
  branchId: string;
  invoiceNumber: string;
  items: {
    medicineId: string;
    batchNumber: string;
    mfgDate: string;
    expiryDate: string;
    qty: number;
    unitId?: string;
    purchasePrice: number;
    mrp: number;
    sellingPrice: number;
    taxPercent?: number;
    discountPercent?: number;
  }[];
  notes?: string;
}

export interface CreateStockAdjustmentDto {
  branchId: string;
  medicineId: string;
  batchId: string;
  adjustmentQty: number;
  reason: string;
  notes?: string;
}

export interface DashboardSummaryDto {
  todaySales: number;
  todayPurchases: number;
  currentStockValue: number;
  estimatedGrossProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringStockCount: number;
  expiredStockCount: number;
  pendingSupplierPayments: number;
  salesCountToday: number;
}

export interface ThermalReceiptDataDto {
  storeName: string;
  logo?: string | null;
  address: string;
  phone: string;
  email?: string | null;
  gstNumber?: string | null;
  pharmacyLicense?: string | null;
  invoiceNumber: string;
  date: string;
  time: string;
  cashierName: string;
  customerName?: string | null;
  customerMobile?: string | null;
  items: {
    name: string;
    batch: string;
    expiry: string;
    qty: number;
    unit: string;
    rate: number;
    mrp: number;
    discount: number;
    tax: number;
    amount: number;
  }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMode: string;
  payments: { mode: string; amount: number }[];
  footerText?: string | null;
  thankYouMessage?: string | null;
  returnPolicy?: string | null;
  paperWidth: PaperWidth;
  isReprint?: boolean;
}

export interface OpenShiftDto {
  branchId: string;
  openingCash: number;
  notes?: string;
}

export interface CloseShiftDto {
  shiftId: string;
  closingCash: number;
  notes?: string;
}

export interface ShiftSummaryDto {
  shiftId: string;
  branchId: string;
  cashierName: string;
  status: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalCashSales: number;
  totalUpiSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalReturnsAmount: number;
  totalExpensesAmount: number;
  expectedCash: number;
  closingCash?: number | null;
  cashDifference?: number | null;
}

