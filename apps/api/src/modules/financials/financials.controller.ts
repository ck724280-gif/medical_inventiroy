import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('financials')
export class FinancialsController {
  constructor(private financialsService: FinancialsService) {}

  @Get('summary')
  @RequirePermissions('report.view')
  async getSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.financialsService.getFinancialSummary({ branchId, startDate, endDate });
  }
}
