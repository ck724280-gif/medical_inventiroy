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
import { PaymentMode } from '@medical-inventory/shared-types';

export class PurchaseItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Medicine ID is required' })
  medicineId: string;

  @IsString()
  @IsNotEmpty({ message: 'Batch number is required' })
  batchNumber: string;

  @IsNotEmpty({ message: 'Manufacturing date is required' })
  mfgDate: string | Date;

  @IsNotEmpty({ message: 'Expiry date is required' })
  expiryDate: string | Date;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  qty: number;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  mrp: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Supplier ID is required' })
  supplierId: string;

  @IsString()
  @IsNotEmpty({ message: 'Branch ID is required' })
  branchId: string;

  @IsString()
  @IsNotEmpty({ message: 'Invoice number is required' })
  invoiceNumber: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPurchasePaymentDto {
  @IsNumber()
  @Min(0.01)
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

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

