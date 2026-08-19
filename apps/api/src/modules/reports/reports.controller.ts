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
