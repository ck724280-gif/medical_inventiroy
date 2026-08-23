import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('universal')
  async searchUniversal(
    @Query('q') q: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: number
  ) {
    return this.searchService.searchUniversal(q || '', branchId, limit ? Number(limit) : 20);
  }

  @Get('medicines')
  async searchMedicines(
    @Query('q') q: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: number
  ) {
    return this.searchService.searchMedicines(q || '', branchId, limit ? Number(limit) : 20);
  }

  @Get('customers')
  async searchCustomers(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchCustomers(q || '', limit ? Number(limit) : 20);
  }

  @Get('suppliers')
  async searchSuppliers(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.searchService.searchSuppliers(q || '', limit ? Number(limit) : 20);
  }

  @Get('invoices')
  async searchInvoices(
    @Query('q') q: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: number
  ) {
    return this.searchService.searchInvoices(q || '', branchId, limit ? Number(limit) : 20);
  }
}
