import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CheckoutSaleDto } from './dto/create-sale.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { PaperWidth } from '@medical-inventory/shared-types';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @RequirePermissions('sale.view')
  async findAll(@Query() query: any) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('sale.view')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get(':id/receipt')
  @RequirePermissions('sale.view')
  async getReceiptData(
    @Param('id') id: string,
    @Query('paperWidth') paperWidth?: PaperWidth
  ) {
    return this.salesService.getReceiptData(id, paperWidth);
  }

  @Post('checkout')
  @RequirePermissions('sale.create')
  @Auditable('checkout_sale', 'SalesInvoice')
  async checkout(
    @Body() dto: CheckoutSaleDto,
    @CurrentUser('id') userId: string
  ) {
    return this.salesService.checkout(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('sale.edit')
  @Auditable('edit_sale', 'SalesInvoice')
  async update(
    @Param('id') id: string,
    @Body() dto: any
  ) {
    return this.salesService.updateSalesInvoice(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sale.delete')
  @Auditable('delete_sale', 'SalesInvoice')
  async remove(@Param('id') id: string) {
    return this.salesService.deleteSalesInvoice(id);
  }
}
