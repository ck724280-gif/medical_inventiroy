import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomerCreditService } from './customer-credit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customer-credits')
export class CustomerCreditController {
  constructor(private readonly customerCreditService: CustomerCreditService) {}

  /** GET /customer-credits/branch/:branchId — Branch-wise outstanding (§49) */
  @Get('branch/:branchId')
  getBranchOutstanding(
    @Param('branchId') branchId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.customerCreditService.getBranchOutstanding(branchId, page, limit);
  }

  /** GET /customer-credits/customer/:customerId — Customer-wise outstanding (§49) */
  @Get('customer/:customerId')
  getCustomerOutstanding(
    @Param('customerId') customerId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.customerCreditService.getCustomerOutstanding(customerId, branchId);
  }

  /** GET /customer-credits/org-wide — Organisation-wide outstanding (SA only) (§49) */
  @Get('org-wide')
  getOrgWideOutstanding(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.customerCreditService.getOrgWideOutstanding(page, limit);
  }

  /** GET /customer-credits/customer/:customerId/history — Payment history (§49) */
  @Get('customer/:customerId/history')
  getPaymentHistory(
    @Param('customerId') customerId: string,
    @Query('branchId') branchId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.customerCreditService.getPaymentHistory(customerId, branchId, page, limit);
  }

  /** PATCH /customer-credits/:id/payment — Record payment (§49) */
  @Patch(':id/payment')
  recordPayment(
    @Param('id') id: string,
    @Body('paidAmount') paidAmount: number,
    @Body('paymentMethod') paymentMethod: string,
    @Body('reference') reference: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.customerCreditService.recordPayment(
      id,
      paidAmount,
      paymentMethod,
      req.user.id,
      reference,
      notes,
    );
  }
}
