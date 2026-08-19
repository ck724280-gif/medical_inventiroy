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
import { CustomersService } from './customers.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customer.view')
  async findAll(@Query() query: any) {
    return this.customersService.findAll(query);
  }

  @Get('search/:mobile')
  @RequirePermissions('customer.view')
  async findByMobile(@Param('mobile') mobile: string) {
    return this.customersService.findByMobile(mobile);
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @RequirePermissions('customer.create')
  @Auditable('create_customer', 'Customer')
  async create(@Body() data: any) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('customer.edit')
  @Auditable('update_customer', 'Customer')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('customer.delete')
  @Auditable('delete_customer', 'Customer')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
