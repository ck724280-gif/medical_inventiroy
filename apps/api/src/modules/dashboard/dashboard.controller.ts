import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Query('branchId') branchId?: string) {
    return this.dashboardService.getDashboardSummary(branchId);
  }
}
