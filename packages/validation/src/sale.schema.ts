import { z } from 'zod';
import { PaymentMode, ReturnCondition, PaperWidth } from '@medical-inventory/shared-types';

export const cartItemSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  batchId: z.string().optional(),
  qty: z.number().int().positive('Quantity must be positive'),
  unitId: z.string().optional().nullable(),
  rate: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const salePaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMode: z.nativeEnum(PaymentMode),
  referenceNumber: z.string().max(100).optional().nullable(),
});

export const posCheckoutSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  customerId: z.string().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  customerMobile: z.string().min(10).max(15).optional().nullable(),
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  payments: z.array(salePaymentSchema).min(1, 'At least one payment method is required'),
  invoiceDiscountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).optional().nullable(),
  paperWidth: z.nativeEnum(PaperWidth).default(PaperWidth.WIDTH_58MM),
});

export const createSalesReturnSchema = z.object({
  salesInvoiceId: z.string().min(1, 'Sales invoice is required'),
  branchId: z.string().min(1, 'Branch is required'),
  customerId: z.string().optional().nullable(),
  refundMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  items: z.array(
    z.object({
      salesItemId: z.string().min(1),
      medicineId: z.string().min(1),
      batchId: z.string().min(1),
      returnQty: z.number().int().positive('Return quantity must be positive'),
      condition: z.nativeEnum(ReturnCondition).default(ReturnCondition.RESALABLE),
      reason: z.string().max(500).optional().nullable(),
    })
  ).min(1, 'At least one return item is required'),
  notes: z.string().max(1000).optional().nullable(),
});
