import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { BatchesService } from './batches.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';
import { BatchStatus } from '@medical-inventory/shared-types';

@Controller('batches')
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Get()
  @RequirePermissions('inventory.view')
  async findAll(@Query() query: any) {
    return this.batchesService.findAll(query);
  }

  @Get('expiry-dashboard')
  @RequirePermissions('inventory.view')
  async getExpiryDashboard(@Query('branchId') branchId?: string) {
    return this.batchesService.getExpiryDashboard(branchId);
  }

  @Get(':id')
  @RequirePermissions('inventory.view')
  async findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions('inventory.adjust')
  @Auditable('update_batch_status', 'Batch')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: BatchStatus
  ) {
    return this.batchesService.updateStatus(id, status);
  }
}
