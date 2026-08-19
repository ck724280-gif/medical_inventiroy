import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @RequirePermissions('medicine.create')
  @Auditable('create_category', 'MedicineCategory')
  async create(@Body() data: { name: string; description?: string; parentId?: string }) {
    return this.categoriesService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('medicine.edit')
  @Auditable('update_category', 'MedicineCategory')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; parentId?: string; isActive?: boolean }
  ) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('medicine.delete')
  @Auditable('delete_category', 'MedicineCategory')
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
