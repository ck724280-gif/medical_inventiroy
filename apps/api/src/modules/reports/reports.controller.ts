import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions('report.view')
  async getSalesReport(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getSalesReport({ branchId, startDate, endDate });
  }

  @Get('purchases')
  @RequirePermissions('report.view')
  async getPurchaseReport(
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getPurchaseReport({ branchId, supplierId, startDate, endDate });
  }

  @Get('inventory')
  @RequirePermissions('report.view')
  async getInventoryValuation(@Query('branchId') branchId?: string) {
    return this.reportsService.getInventoryValuationReport(branchId);
  }

  @Get('gstr1')
  @RequirePermissions('report.view')
  async getGstr1(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getGstr1Report({ branchId, startDate, endDate });
  }

  @Get('gstr1/export/excel')
  @RequirePermissions('report.export')
  async exportGstr1Excel(
    @Query('branchId') branchId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Res() res: Response
  ) {
    const buffer = await this.reportsService.exportGstr1Excel({ branchId, startDate, endDate });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="gstr1-report.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('gstr3b')
  @RequirePermissions('report.view')
  async getGstr3b(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getGstr3bReport({ branchId, startDate, endDate });
  }

  @Get('hsn-summary')
  @RequirePermissions('report.view')
  async getHsnSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getHsnSummaryReport({ branchId, startDate, endDate });
  }

  @Get('schedule-h')
  @RequirePermissions('report.view')
  async getScheduleH(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('schedule') schedule?: string
  ) {
    return this.reportsService.getScheduleHReport({ branchId, startDate, endDate, schedule });
  }

  @Get('schedule-h/export/excel')
  @RequirePermissions('report.export')
  async exportScheduleHExcel(
    @Query('branchId') branchId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('schedule') schedule: string | undefined,
    @Res() res: Response
  ) {
    const buffer = await this.reportsService.exportScheduleHExcel({ branchId, startDate, endDate, schedule });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="schedule-h-register.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('inventory/export/excel')
  @RequirePermissions('report.export')
  async exportInventoryExcel(
    @Query('branchId') branchId: string | undefined,
    @Res() res: Response
  ) {
    const buffer = await this.reportsService.exportInventoryExcel(branchId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventory-valuation.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
