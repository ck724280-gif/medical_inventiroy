import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { FefoService } from './fefo.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, FefoService],
  exports: [InventoryService, FefoService],
})
export class InventoryModule {}
