import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  CashRegistersService,
  OpenShiftDto,
  CloseShiftDto,
  OpenRegisterDto,
  CloseRegisterDto,
} from './cash-registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard)
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  // ── Store Cash Register Master Endpoints ─────────────────

  @Get('register/current')
  async getCurrentRegister(
    @CurrentUser('id') userId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.cashRegistersService.getCurrentRegister(userId, branchId);
  }

  @Post('register/open')
  async openRegister(
    @Body() dto: OpenRegisterDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.openRegister(dto, userId);
  }

  @Post('register/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeRegister(
    @Param('id', UUIDValidationPipe) id: string,
    @Body() dto: CloseRegisterDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.closeRegister(id, dto, userId);
  }

  // ── Staff Cashier Shift Endpoints ────────────────────────

  @Get('current')
  @Get('shift/current')
  async getCurrentShift(
    @CurrentUser('id') userId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.cashRegistersService.getCurrentShift(userId, branchId);
  }

  @Post('open')
  @Post('shift/open')
  async openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.openShift(dto, userId);
  }

  @Post(':id/close')
  @Post('shift/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @Param('id', UUIDValidationPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.closeShift(id, dto, userId);
  }

  @Get(':id/report')
  @Get('shift/:id/report')
  async getShiftReport(@Param('id', UUIDValidationPipe) id: string) {
    return this.cashRegistersService.getShiftReport(id);
  }

  @Get('shifts')
  async getBranchShifts(
    @Query('branchId') branchId?: string,
    @Query('registerSessionId') registerSessionId?: string
  ) {
    return this.cashRegistersService.getBranchShifts(branchId, registerSessionId);
  }
}
