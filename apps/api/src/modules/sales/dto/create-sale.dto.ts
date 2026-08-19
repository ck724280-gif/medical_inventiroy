import {
  IsArray,
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
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;
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
  @IsEnum(PaperWidth)
  paperWidth?: PaperWidth;

  @IsOptional()
  @IsString()
  notes?: string;
}
