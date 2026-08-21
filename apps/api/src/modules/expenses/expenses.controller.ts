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
import { ExpensesService } from './expenses.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  @RequirePermissions('expense.view')
  async findAll(@Query() query: any) {
    return this.expensesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('expense.view')
  async findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Get(':id/voucher')
  @RequirePermissions('expense.view')
  async getExpenseVoucher(@Param('id') id: string) {
    return this.expensesService.getExpenseVoucher(id);
  }

  @Post()
  @RequirePermissions('expense.create')
  @Auditable('create_expense', 'Expense')
  async create(
    @Body() dto: any,
    @CurrentUser('id') userId: string
  ) {
    return this.expensesService.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('expense.edit')
  @Auditable('update_expense', 'Expense')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('expense.edit')
  @Auditable('delete_expense', 'Expense')
  async remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
