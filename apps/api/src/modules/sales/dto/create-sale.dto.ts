import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode, PaperWidth } from '@medical-inventory/shared-types';

export class PrescriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Doctor name is required' })
  doctorName: string;

  @IsString()
  @IsNotEmpty({ message: 'Doctor registration number is required' })
  doctorRegNo: string;

  @IsString()
  @IsNotEmpty({ message: 'Patient name is required' })
  patientName: string;

  @IsNumber()
  @Min(1, { message: 'Patient age must be positive' })
  patientAge: number;

  @IsOptional()
  @IsString()
  patientAddress?: string;

  @IsOptional()
  @IsString()
  prescriptionNumber?: string;

  @IsOptional()
  @IsString()
  drugSchedule?: string;
}

export class CartItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Medicine ID is required' })
  medicineId: string;

  @IsOptional()
  @IsString()
  batchId?: string; // Optional: If not provided, FEFO automatically selects

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  qty: number;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  unitLevel?: string; // 'BOX' | 'STRIP' | 'TABLET'

  @IsOptional()
  @IsNumber()
  selectedQuantity?: number;

  @IsOptional()
  @IsNumber()
  conversionRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  priceOverrideReason?: string;
}

export class PaymentSplitDto {
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckoutSaleDto {
  @IsString()
  @IsNotEmpty({ message: 'Branch ID is required' })
  branchId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerMobile?: string;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsOptional()
  @IsBoolean()
  isB2B?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments: PaymentSplitDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  invoiceDiscountPercent?: number;

  @IsOptional()
  @IsNumber()
  roundOffAmount?: number;

  @IsOptional()
  @IsString()
  roundOffMode?: string;

  @IsOptional()
  @IsEnum(PaperWidth)
  paperWidth?: PaperWidth;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  isReprint?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrescriptionDto)
  prescription?: PrescriptionDto;
}

export class OpenShiftDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNumber()
  @Min(0, { message: 'Opening cash cannot be negative' })
  openingCash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'Shift ID is required' })
  shiftId: string;

  @IsNumber()
  @Min(0, { message: 'Closing cash cannot be negative' })
  closingCash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
