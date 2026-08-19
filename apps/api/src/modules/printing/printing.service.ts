import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { EscPosService } from './esc-pos.service';
import { PaperWidth, PrinterType } from '@medical-inventory/shared-types';

@Injectable()
export class PrintingService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
    private escPosService: EscPosService
  ) {}

  async getThermalReceipt(invoiceId: string, paperWidth?: PaperWidth) {
    const receiptData = await this.salesService.getReceiptData(invoiceId, paperWidth);
    const escPosBuffer = this.escPosService.generateEscPosCommands(receiptData);

    return {
      receiptData,
      escPosBase64: escPosBuffer.toString('base64'),
    };
  }

  async listPrinters(branchId?: string) {
    return this.prisma.printerSetting.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true, code: true } } },
    });
  }

  async savePrinter(data: {
    branchId: string;
    name: string;
    type: PrinterType;
    connectionString?: string;
    paperWidth: PaperWidth;
    isDefault?: boolean;
    config?: any;
  }) {
    if (data.isDefault) {
      await this.prisma.printerSetting.updateMany({
        where: { branchId: data.branchId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.printerSetting.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        type: data.type,
        connectionString: data.connectionString || null,
        paperWidth: data.paperWidth,
        isDefault: data.isDefault ?? false,
        config: data.config || null,
      },
    });
  }

  async deletePrinter(id: string) {
    return this.prisma.printerSetting.delete({ where: { id } });
  }
}
