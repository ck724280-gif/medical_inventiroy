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
import {
  CheckoutSaleDto,
  OpenShiftDto,
  CloseShiftDto,
} from '../sales/dto/create-sale.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @Get('search')
  @RequirePermissions('sale.create')
  async search(
    @Query('q') q: string,
    @Query('branchId') branchId: string
  ) {
    return this.posService.search(q, branchId);
  }

  @Get('scan/:barcode')
  @RequirePermissions('sale.create')
  async quickScan(
    @Param('barcode') barcode: string,
    @Query('branchId') branchId: string
  ) {
    return this.posService.quickScan(barcode, branchId);
  }

  @Get('batches/:medicineId')
  @RequirePermissions('sale.create')
  async getBatches(
    @Param('medicineId') medicineId: string,
    @Query('branchId') branchId: string
  ) {
    return this.posService.getBatchesForMedicine(medicineId, branchId);
  }

  @Get('last-bill')
  @RequirePermissions('sale.create')
  async getLastBill(
    @Query('branchId') branchId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.posService.getLastBill(branchId, userId);
  }

  // ── Cashier Shift Management ──────────────────────────────

  @Get('shift/current')
  @RequirePermissions('sale.create')
  async getCurrentShift(
    @CurrentUser('id') userId: string,
    @Query('branchId') branchId: string
  ) {
    return this.posService.getCurrentShift(userId, branchId);
  }

  @Post('shift/open')
  @RequirePermissions('sale.create')
  @Auditable('shift_open', 'CashierShift')
  async openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.posService.openShift(dto, userId);
  }

  @Get('shift/summary/:id')
  @RequirePermissions('sale.create')
  async getShiftSummary(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.posService.getShiftSummary(id, userId);
  }

  @Post('shift/close')
  @RequirePermissions('sale.create')
  @Auditable('shift_close', 'CashierShift')
  async closeShift(
    @Body() dto: CloseShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.posService.closeShift(dto, userId);
  }

  // ── Held Carts ────────────────────────────────────────────

  @Get('held')
  @RequirePermissions('sale.create')
  async listHeldCarts(@Query('branchId') branchId?: string) {
    return this.posService.listHeldCarts(branchId);
  }

  @Post('hold')
  @RequirePermissions('sale.create')
  async holdCart(
    @Body()
    body: {
      name?: string;
      customer?: any;
      cart: any;
      branchId: string;
    },
    @CurrentUser('id') userId: string
  ) {
    return this.posService.holdCart({ ...body, userId });
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

  // ── Checkout ──────────────────────────────────────────────

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
