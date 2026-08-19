import { z } from 'zod';

export const createPurchaseOrderItemSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  orderedQty: z.number().int().positive('Quantity must be positive'),
  unitId: z.string().optional().nullable(),
  expectedRate: z.number().min(0, 'Rate must be non-negative'),
  taxPercent: z.number().min(0).max(100).default(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  branchId: z.string().min(1, 'Branch is required'),
  expectedDeliveryDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(createPurchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED']),
});
