import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import {
  CreatePurchaseDto,
  RecordPurchasePaymentDto,
} from './dto/create-purchase.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  @RequirePermissions('purchase.view')
  async findAll(@Query() query: any) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('purchase.view')
  async findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  @RequirePermissions('purchase.create')
  @Auditable('create_purchase', 'PurchaseInvoice')
  async create(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser('id') userId: string,
    @Query('draft') draft?: string
  ) {
    const isDraft = draft === 'true';
    return this.purchasesService.create(dto, userId, isDraft);
  }

  @Post(':id/confirm')
  @RequirePermissions('purchase.create')
  @Auditable('confirm_purchase', 'PurchaseInvoice')
  async confirm(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.purchasesService.confirmPurchase(id, userId);
  }

  @Post(':id/payments')
  @RequirePermissions('purchase.create')
  @Auditable('record_purchase_payment', 'PurchasePayment')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPurchasePaymentDto,
    @CurrentUser('id') userId: string
  ) {
    return this.purchasesService.recordPayment(id, dto, userId);
  }
}
