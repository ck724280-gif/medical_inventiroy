import { Module } from '@nestjs/common';
import { FinancialsController } from './financials.controller';
import { FinancialsService } from './financials.service';

@Module({
  controllers: [FinancialsController],
  providers: [FinancialsService],
  exports: [FinancialsService],
})
export class FinancialsModule {}
