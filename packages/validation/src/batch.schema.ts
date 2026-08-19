import { z } from 'zod';
import { BatchStatus, AdjustmentReason } from '@medical-inventory/shared-types';

export const createBatchSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  branchId: z.string().min(1, 'Branch is required'),
  batchNumber: z.string().min(1, 'Batch number is required').max(100),
  mfgDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
  supplierId: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  mrp: z.number().min(0, 'MRP cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  taxPercent: z.number().min(0).max(100).default(0),
  initialQty: z.number().int().min(0),
  currentQty: z.number().int().min(0),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.ACTIVE),
});

export const updateBatchSchema = createBatchSchema.partial();

export const stockAdjustmentSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  medicineId: z.string().min(1, 'Medicine is required'),
  batchId: z.string().min(1, 'Batch is required'),
  adjustmentQty: z.number().int(), // Can be positive or negative
  reason: z.nativeEnum(AdjustmentReason).or(z.string()),
  notes: z.string().max(500).optional().nullable(),
});

export const stockTransferSchema = z.object({
  fromBranchId: z.string().min(1, 'Source branch is required'),
  toBranchId: z.string().min(1, 'Destination branch is required'),
  items: z.array(
    z.object({
      medicineId: z.string().min(1),
      batchId: z.string().min(1),
      qty: z.number().int().positive('Transfer quantity must be positive'),
      unitId: z.string().optional().nullable(),
    })
  ).min(1, 'At least one item is required in a stock transfer'),
  notes: z.string().max(500).optional().nullable(),
}).refine((data) => data.fromBranchId !== data.toBranchId, {
  message: 'Source and destination branches cannot be the same',
  path: ['toBranchId'],
});
