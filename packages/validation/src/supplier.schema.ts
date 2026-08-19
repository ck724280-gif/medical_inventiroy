import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100),
  company: z.string().max(100).optional().nullable(),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  email: z.string().email('Invalid email').optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
  creditLimit: z.number().min(0).default(0),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();
