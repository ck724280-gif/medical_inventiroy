import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CheckoutSaleDto } from '../sales/dto/create-sale.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @Get('scan/:barcode')
  @RequirePermissions('sale.create')
  async quickScan(
    @Param('barcode') barcode: string,
    @Query('branchId') branchId: string
  ) {
    return this.posService.quickScan(barcode, branchId);
  }

  @Get('held')
  @RequirePermissions('sale.create')
  async listHeldCarts() {
    return this.posService.listHeldCarts();
  }

  @Post('hold')
  @RequirePermissions('sale.create')
  async holdCart(@Body() body: { name?: string; cart: any }) {
    return this.posService.holdCart(body);
  }

  @Post('resume/:id')
  @RequirePermissions('sale.create')
  async resumeCart(@Param('id') id: string) {
    return this.posService.resumeCart(id);
  }

  @Delete('held/:id')
  @RequirePermissions('sale.create')
  async deleteHeldCart(@Param('id') id: string) {
    return this.posService.deleteHeldCart(id);
  }

  @Post('checkout')
  @RequirePermissions('sale.create')
  @Auditable('pos_checkout', 'SalesInvoice')
  async checkout(
    @Body() dto: CheckoutSaleDto,
    @CurrentUser('id') userId: string
  ) {
    return this.posService.checkout(dto, userId);
  }
}
