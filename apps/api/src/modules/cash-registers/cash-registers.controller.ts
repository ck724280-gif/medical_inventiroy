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
import { CashRegistersService, OpenShiftDto, CloseShiftDto } from './cash-registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard)
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Get('current')
  async getCurrentShift(
    @CurrentUser('id') userId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.cashRegistersService.getCurrentShift(userId, branchId);
  }

  @Post('open')
  async openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.openShift(dto, userId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @Param('id', UUIDValidationPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser('id') userId: string
  ) {
    return this.cashRegistersService.closeShift(id, dto, userId);
  }

  @Get(':id/report')
  async getShiftReport(@Param('id', UUIDValidationPipe) id: string) {
    return this.cashRegistersService.getShiftReport(id);
  }
}
