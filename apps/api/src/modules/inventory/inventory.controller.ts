import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('overview')
  @RequirePermissions('inventory.view')
  async getOverview(@Query() query: any) {
    return this.inventoryService.getStockOverview(query);
  }

  @Get('low-stock')
  @RequirePermissions('inventory.view')
  async getLowStock(@Query('branchId') branchId?: string) {
    return this.inventoryService.getLowStock(branchId);
  }

  @Get('movements')
  @RequirePermissions('inventory.view')
  async getMovements(@Query() query: any) {
    return this.inventoryService.getMovements(query);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  @Auditable('create_stock_adjustment', 'StockAdjustment')
  async createAdjustment(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.createAdjustment(dto, userId);
  }

  @Post('transfers')
  @RequirePermissions('inventory.transfer')
  @Auditable('create_stock_transfer', 'StockTransfer')
  async createTransfer(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.createTransfer(dto, userId);
  }

  @Post('transfers/:id/receive')
  @RequirePermissions('inventory.transfer')
  @Auditable('receive_stock_transfer', 'StockTransfer')
  async receiveTransfer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.receiveTransfer(id, userId);
  }
}
