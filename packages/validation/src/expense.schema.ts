import { z } from 'zod';
import { ExpenseCategory, PaymentMode } from '@medical-inventory/shared-types';

export const createExpenseSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().positive('Expense amount must be greater than 0'),
  date: z.string().or(z.date()).default(() => new Date()),
  paymentMethod: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  notes: z.string().max(500).optional().nullable(),
  attachmentPath: z.string().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
