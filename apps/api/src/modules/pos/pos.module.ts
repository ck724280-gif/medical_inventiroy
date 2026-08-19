import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { SalesModule } from '../sales/sales.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [SalesModule, InventoryModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
