import {
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get(':id/pdf')
  @RequirePermissions('sale.view')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.invoicesService.generatePdfInvoice(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
