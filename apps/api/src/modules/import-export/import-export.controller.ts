import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { ImportExportService, OpeningStockRow } from './import-export.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('import-export')
export class ImportExportController {
  constructor(private importExportService: ImportExportService) {}

  @Post('opening-stock')
  @RequirePermissions('inventory.adjust')
  @Auditable('import_opening_stock', 'Batch')
  async importOpeningStock(
    @Body() body: { branchId: string; rows: OpeningStockRow[] },
    @CurrentUser('id') userId: string
  ) {
    return this.importExportService.importOpeningStock(body.branchId, body.rows, userId);
  }
}
