import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.email || data.mobile, {
  message: 'Either email or mobile is required',
  path: ['email'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must match'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(10).optional().nullable(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  branchIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });
