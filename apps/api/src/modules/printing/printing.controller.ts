import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PrintingService } from './printing.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { PaperWidth } from '@medical-inventory/shared-types';

@Controller('printing')
export class PrintingController {
  constructor(private printingService: PrintingService) {}

  @Get('thermal/:invoiceId')
  @RequirePermissions('sale.view')
  async getThermalReceipt(
    @Param('invoiceId') invoiceId: string,
    @Query('paperWidth') paperWidth?: PaperWidth
  ) {
    return this.printingService.getThermalReceipt(invoiceId, paperWidth);
  }

  @Get('printers')
  @RequirePermissions('printer.manage')
  async listPrinters(@Query('branchId') branchId?: string) {
    return this.printingService.listPrinters(branchId);
  }

  @Post('printers')
  @RequirePermissions('printer.manage')
  @Auditable('save_printer_setting', 'PrinterSetting')
  async savePrinter(@Body() body: any) {
    return this.printingService.savePrinter(body);
  }

  @Delete('printers/:id')
  @RequirePermissions('printer.manage')
  @Auditable('delete_printer_setting', 'PrinterSetting')
  async deletePrinter(@Param('id') id: string) {
    return this.printingService.deletePrinter(id);
  }
}
