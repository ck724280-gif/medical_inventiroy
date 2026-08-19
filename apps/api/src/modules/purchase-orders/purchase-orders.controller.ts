import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.purchaseOrdersService.create(body, user?.id || 'system-user');
  }

  @Get()
  findAll(@Query() query: any) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.purchaseOrdersService.updateStatus(id, status);
  }

  @Post(':id/convert')
  convertToInwardBill(@Param('id') id: string) {
    return this.purchaseOrdersService.convertToInwardBill(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
