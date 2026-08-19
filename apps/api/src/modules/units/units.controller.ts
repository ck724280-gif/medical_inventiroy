import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  async findAll() {
    return this.unitsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @RequirePermissions('medicine.create')
  @Auditable('create_unit', 'Unit')
  async create(@Body() data: { name: string; abbreviation: string }) {
    return this.unitsService.create(data);
  }

  @Delete(':id')
  @RequirePermissions('medicine.delete')
  @Auditable('delete_unit', 'Unit')
  async remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
