import { z } from 'zod';
import { PaymentMode } from '@medical-inventory/shared-types';

export const purchaseItemSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  batchNumber: z.string().min(1, 'Batch number is required').max(100),
  mfgDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
  qty: z.number().int().positive('Quantity must be greater than 0'),
  unitId: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  mrp: z.number().min(0, 'MRP cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  taxPercent: z.number().min(0).max(100).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  branchId: z.string().min(1, 'Branch is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required in a purchase invoice'),
  notes: z.string().max(1000).optional().nullable(),
});

export const purchasePaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMode: z.nativeEnum(PaymentMode),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paidAt: z.string().or(z.date()).optional(),
});

export const createPurchaseReturnSchema = z.object({
  purchaseInvoiceId: z.string().min(1, 'Purchase invoice is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  branchId: z.string().min(1, 'Branch is required'),
  items: z.array(
    z.object({
      purchaseItemId: z.string().min(1),
      medicineId: z.string().min(1),
      batchId: z.string().min(1),
      returnQty: z.number().int().positive('Return quantity must be positive'),
      reason: z.string().max(500).optional().nullable(),
    })
  ).min(1, 'At least one return item is required'),
  notes: z.string().max(1000).optional().nullable(),
});
