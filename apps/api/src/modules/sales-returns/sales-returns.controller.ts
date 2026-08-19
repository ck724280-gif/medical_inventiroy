import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private salesReturnsService: SalesReturnsService) {}

  @Get()
  @RequirePermissions('sale.return')
  async findAll(@Query() query: any) {
    return this.salesReturnsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('sale.return')
  async findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(id);
  }

  @Post()
  @RequirePermissions('sale.return')
  @Auditable('create_sales_return', 'SalesReturn')
  async create(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return this.salesReturnsService.create(dto, userId);
  }
}
