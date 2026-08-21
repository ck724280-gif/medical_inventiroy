import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DosageForm } from '@medical-inventory/shared-types';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty({ message: 'Medicine name is required' })
  name: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsEnum(DosageForm, { message: 'Invalid dosage form' })
  dosageForm: DosageForm;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  eanUpcGtin?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsNumber()
  @Min(0)
  taxPercent: number;

  @IsString()
  @IsNotEmpty({ message: 'Base unit is required' })
  baseUnitId: string;

  @IsOptional()
  @IsString()
  packSize?: string;

  @IsOptional()
  @IsInt()
  boxQty?: number;

  @IsOptional()
  @IsInt()
  stripQty?: number;

  @IsOptional()
  @IsInt()
  tabletQty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  stripsPerBox?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tabletsPerStrip?: number;

  @IsOptional()
  @IsString()
  drugSchedule?: string;

  @IsOptional()
  @IsBoolean()
  isScheduleH?: boolean;

  @IsOptional()
  @IsBoolean()
  isScheduleH1?: boolean;

  @IsOptional()
  @IsBoolean()
  isScheduleX?: boolean;

  @IsNumber()
  @Min(0)
  mrp: number;

  @IsNumber()
  @Min(0)
  defaultPurchasePrice: number;

  @IsNumber()
  @Min(0)
  defaultSellingPrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reorderQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  unitConversions?: {
    fromUnitId: string;
    toUnitId: string;
    conversionFactor: number;
  }[];
}

export class UpdateMedicineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  composition?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsEnum(DosageForm)
  dosageForm?: DosageForm;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  eanUpcGtin?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @IsOptional()
  @IsString()
  baseUnitId?: string;

  @IsOptional()
  @IsString()
  packSize?: string;

  @IsOptional()
  @IsInt()
  boxQty?: number;

  @IsOptional()
  @IsInt()
  stripQty?: number;

  @IsOptional()
  @IsInt()
  tabletQty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  stripsPerBox?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tabletsPerStrip?: number;

  @IsOptional()
  @IsString()
  drugSchedule?: string;

  @IsOptional()
  @IsBoolean()
  isScheduleH?: boolean;

  @IsOptional()
  @IsBoolean()
  isScheduleH1?: boolean;

  @IsOptional()
  @IsBoolean()
  isScheduleX?: boolean;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsNumber()
  defaultPurchasePrice?: number;

  @IsOptional()
  @IsNumber()
  defaultSellingPrice?: number;

  @IsOptional()
  @IsInt()
  reorderLevel?: number;

  @IsOptional()
  @IsInt()
  reorderQty?: number;

  @IsOptional()
  @IsInt()
  maxStock?: number;

  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
