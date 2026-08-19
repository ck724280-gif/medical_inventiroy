import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ManufacturersService } from './manufacturers.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('manufacturers')
export class ManufacturersController {
  constructor(private manufacturersService: ManufacturersService) {}

  @Get()
  async findAll() {
    return this.manufacturersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.manufacturersService.findOne(id);
  }

  @Post()
  @RequirePermissions('medicine.create')
  @Auditable('create_manufacturer', 'Manufacturer')
  async create(@Body() data: any) {
    return this.manufacturersService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('medicine.edit')
  @Auditable('update_manufacturer', 'Manufacturer')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.manufacturersService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('medicine.delete')
  @Auditable('delete_manufacturer', 'Manufacturer')
  async remove(@Param('id') id: string) {
    return this.manufacturersService.remove(id);
  }
}
