import {
  DosageForm,
  RoleName,
  BatchStatus,
  StockMovementType,
  MovementDirection,
  PurchaseStatus,
  SaleStatus,
  PaymentMode,
  PaymentStatus,
  ReturnCondition,
  PaperWidth,
  PrinterType,
  BarcodeType,
  NotificationType,
  MessageChannel,
  MessageStatus,
  ExpenseCategory,
  TransferStatus,
  AdjustmentReason,
} from '../enums/index.js';

export interface User {
  id: string;
  email: string;
  mobile?: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mfaEnabled: boolean;
  failedLoginCount: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles?: Role[];
  branches?: BranchMembership[];
}

export interface Role {
  id: string;
  name: RoleName | string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
  createdAt: Date;
}

export interface BusinessSettings {
  id: string;
  name: string;
  logo?: string | null;
  favicon?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  pinZip: string;
  phone: string;
  altPhone?: string | null;
  email: string;
  website?: string | null;
  gstNumber?: string | null;
  pharmacyLicense?: string | null;
  description?: string | null;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  defaultLanguage: string;
  businessHours?: Record<string, any> | null;
  updatedAt: Date;
}

export interface BusinessBranding {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  invoiceLogo?: string | null;
  thermalReceiptLogo?: string | null;
  loginBranding?: Record<string, any> | null;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string | null;
  businessHours?: Record<string, any> | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings?: BranchSettings | null;
}

export interface BranchSettings {
  id: string;
  branchId: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  thermalPaperWidth: PaperWidth;
  printerConfig?: Record<string, any> | null;
  updatedAt: Date;
}

export interface BranchMembership {
  id: string;
  userId: string;
  branchId: string;
  createdAt: Date;
  branch?: Branch;
}

export interface MedicineCategory {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: MedicineCategory | null;
  children?: MedicineCategory[];
}

export interface Manufacturer {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  createdAt: Date;
}

export interface MedicineUnit {
  id: string;
  medicineId: string;
  fromUnitId: string;
  toUnitId: string;
  conversionFactor: number;
  fromUnit?: Unit;
  toUnit?: Unit;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  composition?: string | null;
  strength?: string | null;
  dosageForm: DosageForm;
  categoryId?: string | null;
  subCategoryId?: string | null;
  manufacturerId?: string | null;
  sku: string;
  barcode?: string | null;
  eanUpcGtin?: string | null;
  hsnCode?: string | null;
  taxPercent: number;
  baseUnitId: string;
  packSize?: string | null;
  boxQty?: number | null;
  stripQty?: number | null;
  tabletQty?: number | null;
  mrp: number;
  defaultPurchasePrice: number;
  defaultSellingPrice: number;
  reorderLevel: number;
  reorderQty: number;
  maxStock: number;
  prescriptionRequired: boolean;
  isActive: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: MedicineCategory | null;
  subCategory?: MedicineCategory | null;
  manufacturer?: Manufacturer | null;
  baseUnit?: Unit;
  units?: MedicineUnit[];
  batches?: Batch[];
}

export interface Batch {
  id: string;
  medicineId: string;
  branchId: string;
  batchNumber: string;
  mfgDate: Date;
  expiryDate: Date;
  supplierId?: string | null;
  purchaseInvoiceId?: string | null;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  taxPercent: number;
  initialQty: number;
  currentQty: number;
  reservedQty: number;
  damagedQty: number;
  expiredQty: number;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
  medicine?: Medicine;
  branch?: Branch;
  supplier?: Supplier | null;
}

export interface StockMovement {
  id: string;
  branchId: string;
  medicineId: string;
  batchId: string;
  qty: number;
  unitId?: string | null;
  direction: MovementDirection;
  type: StockMovementType;
  referenceType?: string | null;
  referenceId?: string | null;
  userId: string;
  reason?: string | null;
  createdAt: Date;
  medicine?: Medicine;
  batch?: Batch;
  user?: User;
}

export interface StockAdjustment {
  id: string;
  branchId: string;
  medicineId: string;
  batchId: string;
  existingQty: number;
  adjustmentQty: number;
  newQty: number;
  reason: AdjustmentReason | string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  adjustedByUserId: string;
  approvedByUserId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: TransferStatus;
  transferredByUserId: string;
  receivedByUserId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  medicineId: string;
  batchId: string;
  qty: number;
  unitId?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  dob?: Date | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  branchId: string;
  status: PurchaseStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdByUserId: string;
  approvedByUserId?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier?: Supplier;
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
}

export interface PurchaseItem {
  id: string;
  purchaseInvoiceId: string;
  medicineId: string;
  batchId?: string | null;
  batchNumber: string;
  mfgDate: Date;
  expiryDate: Date;
  qty: number;
  unitId?: string | null;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  taxPercent: number;
  discountPercent: number;
  lineTotal: number;
  medicine?: Medicine;
}

export interface PurchasePayment {
  id: string;
  purchaseInvoiceId: string;
  supplierId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string | null;
  paidAt: Date;
  createdByUserId: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseInvoiceId: string;
  supplierId: string;
  branchId: string;
  status: 'PENDING' | 'COMPLETED';
  totalAmount: number;
  notes?: string | null;
  createdByUserId: string;
  createdAt: Date;
  items?: PurchaseReturnItem[];
}

export interface PurchaseReturnItem {
  id: string;
  returnId: string;
  purchaseItemId: string;
  medicineId: string;
  batchId: string;
  returnQty: number;
  reason?: string | null;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId?: string | null;
  status: SaleStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer | null;
  items?: SalesItem[];
  payments?: SalesPayment[];
  branch?: Branch;
  createdByUser?: User;
}

export interface SalesItem {
  id: string;
  salesInvoiceId: string;
  medicineId: string;
  batchId: string;
  qty: number;
  unitId?: string | null;
  rate: number;
  mrp: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
  medicine?: Medicine;
  batch?: Batch;
}

export interface SalesPayment {
  id: string;
  salesInvoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  paidAt: Date;
  createdByUserId: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  salesInvoiceId: string;
  branchId: string;
  customerId?: string | null;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  refundAmount: number;
  refundMode: PaymentMode;
  storeCredit: number;
  notes?: string | null;
  createdByUserId: string;
  createdAt: Date;
  items?: SalesReturnItem[];
  salesInvoice?: SalesInvoice;
}

export interface SalesReturnItem {
  id: string;
  returnId: string;
  salesItemId: string;
  medicineId: string;
  batchId: string;
  returnQty: number;
  condition: ReturnCondition;
  reason?: string | null;
}

export interface Expense {
  id: string;
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  paymentMethod: PaymentMode;
  notes?: string | null;
  attachmentPath?: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  createdAt: Date;
  user?: User | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface PrinterSetting {
  id: string;
  branchId: string;
  name: string;
  type: PrinterType;
  connectionString?: string | null;
  paperWidth: PaperWidth;
  isDefault: boolean;
  config?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  paperWidth: PaperWidth;
  showLogo: boolean;
  showGst: boolean;
  showLicense: boolean;
  headerText?: string | null;
  footerText?: string | null;
  thankYouMessage?: string | null;
  returnPolicy?: string | null;
  displayFields?: Record<string, any> | null;
  isDefault: boolean;
  updatedAt: Date;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  type: 'A4' | 'THERMAL';
  headerHtml?: string | null;
  footerHtml?: string | null;
  bodyTemplate?: string | null;
  config?: Record<string, any> | null;
  isDefault: boolean;
  updatedAt: Date;
}
