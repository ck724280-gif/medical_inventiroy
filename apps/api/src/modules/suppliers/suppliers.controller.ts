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
import { SuppliersService } from './suppliers.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('supplier.view')
  async findAll(@Query() query: any) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('supplier.view')
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermissions('supplier.create')
  @Auditable('create_supplier', 'Supplier')
  async create(@Body() data: any) {
    return this.suppliersService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('supplier.edit')
  @Auditable('update_supplier', 'Supplier')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('supplier.edit')
  @Auditable('deactivate_supplier', 'Supplier')
  async remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
