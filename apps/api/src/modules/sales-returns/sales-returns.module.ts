import { Module } from '@nestjs/common';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

@Module({
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
  exports: [SalesReturnsService],
})
export class SalesReturnsModule {}
