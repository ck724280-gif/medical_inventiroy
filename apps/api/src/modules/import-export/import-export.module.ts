import { Module } from '@nestjs/common';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';

@Module({
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}
