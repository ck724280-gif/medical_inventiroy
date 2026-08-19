import { z } from 'zod';

export const createPartyPricingSchema = z.object({
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']).default('CUSTOMER'),
  customerId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  medicineId: z.string().min(1, 'Medicine is required'),
  customPrice: z.number().min(0, 'Price must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  effectiveFrom: z.string().or(z.date()).optional().nullable(),
  effectiveTo: z.string().or(z.date()).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePartyPricingSchema = createPartyPricingSchema.partial();
