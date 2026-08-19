import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto, UpdateMedicineDto } from './dto/create-medicine.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('medicines')
export class MedicinesController {
  constructor(private medicinesService: MedicinesService) {}

  @Get()
  @RequirePermissions('medicine.view')
  async findAll(@Query() query: any) {
    return this.medicinesService.findAll(query);
  }

  @Get('barcode/:code')
  @RequirePermissions('medicine.view')
  async findByBarcode(
    @Param('code') code: string,
    @Query('branchId') branchId?: string
  ) {
    return this.medicinesService.findByBarcode(code, branchId);
  }

  @Get(':id')
  @RequirePermissions('medicine.view')
  async findOne(
    @Param('id') id: string,
    @Query('branchId') branchId?: string
  ) {
    return this.medicinesService.findOne(id, branchId);
  }

  @Post()
  @RequirePermissions('medicine.create')
  @Auditable('create_medicine', 'Medicine')
  async create(@Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('medicine.edit')
  @Auditable('update_medicine', 'Medicine')
  async update(@Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicinesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('medicine.delete')
  @Auditable('delete_medicine', 'Medicine')
  async remove(@Param('id') id: string) {
    return this.medicinesService.remove(id);
  }
}
