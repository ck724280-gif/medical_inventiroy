import { Module } from '@nestjs/common';
import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';
import { EscPosService } from './esc-pos.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [PrintingController],
  providers: [PrintingService, EscPosService],
  exports: [PrintingService, EscPosService],
})
export class PrintingModule {}
