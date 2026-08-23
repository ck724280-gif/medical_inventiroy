import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateApprovalRequestDto {
  @IsString()
  branchId: string;

  @IsString()
  action: string; // PURCHASE_APPROVAL | STOCK_ADJUST | INVOICE_CANCEL | HIGH_DISCOUNT | EXPENSE | SUPPLIER_PAYMENT | LARGE_REFUND | MANUAL_STOCK_IN | MANUAL_STOCK_OUT

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  requestedValue?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveApprovalDto {
  @IsString()
  @IsEnum(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: string;

  @IsOptional()
  @IsString()
  approvedValue?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
