import { z } from 'zod';
import { PaperWidth, PrinterType } from '@medical-inventory/shared-types';

export const updateBusinessSettingsSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  logo: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  address: z.string().min(1, 'Address is required').max(300),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  country: z.string().min(1, 'Country is required').max(100).default('India'),
  pinZip: z.string().min(1, 'PIN/ZIP is required').max(20),
  phone: z.string().min(10, 'Phone is required').max(20),
  altPhone: z.string().max(20).optional().nullable(),
  email: z.string().email('Invalid business email'),
  website: z.string().url('Invalid website URL').optional().nullable(),
  gstNumber: z.string().max(30).optional().nullable(),
  pharmacyLicense: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  currencyCode: z.string().default('INR'),
  currencySymbol: z.string().default('₹'),
  timezone: z.string().default('Asia/Kolkata'),
  dateFormat: z.string().default('DD-MM-YYYY'),
  timeFormat: z.string().default('12h'),
  defaultLanguage: z.string().default('en'),
  businessHours: z.record(z.any()).optional().nullable(),
});

export const updateBusinessBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #0284c7)').default('#0284c7'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').default('#0f172a'),
  invoiceLogo: z.string().optional().nullable(),
  thermalReceiptLogo: z.string().optional().nullable(),
  loginBranding: z.record(z.any()).optional().nullable(),
});

export const updateReceiptTemplateSchema = z.object({
  name: z.string().min(1),
  paperWidth: z.nativeEnum(PaperWidth).default(PaperWidth.WIDTH_58MM),
  showLogo: z.boolean().default(true),
  showGst: z.boolean().default(true),
  showLicense: z.boolean().default(true),
  headerText: z.string().max(200).optional().nullable(),
  footerText: z.string().max(200).optional().nullable(),
  thankYouMessage: z.string().max(200).default('Thank You! Get Well Soon'),
  returnPolicy: z.string().max(300).optional().nullable(),
  displayFields: z.record(z.any()).optional().nullable(),
});

export const printerSettingSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  name: z.string().min(1, 'Printer name is required').max(100),
  type: z.nativeEnum(PrinterType).default(PrinterType.USB),
  connectionString: z.string().max(200).optional().nullable(),
  paperWidth: z.nativeEnum(PaperWidth).default(PaperWidth.WIDTH_58MM),
  isDefault: z.boolean().default(false),
  config: z.record(z.any()).optional().nullable(),
});
