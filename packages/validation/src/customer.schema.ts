import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').max(15).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  dob: z.string().or(z.date()).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial();
