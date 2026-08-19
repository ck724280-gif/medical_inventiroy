import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PurchaseReturnsService } from './purchase-returns.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private purchaseReturnsService: PurchaseReturnsService) {}

  @Get()
  @RequirePermissions('purchase.return')
  async findAll(@Query() query: any) {
    return this.purchaseReturnsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('purchase.return')
  async findOne(@Param('id') id: string) {
    return this.purchaseReturnsService.findOne(id);
  }

  @Post()
  @RequirePermissions('purchase.return')
  @Auditable('create_purchase_return', 'PurchaseReturn')
  async create(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return this.purchaseReturnsService.create(dto, userId);
  }
}
