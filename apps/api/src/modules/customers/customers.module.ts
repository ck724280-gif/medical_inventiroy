import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerCreditController } from './customer-credit.controller';
import { CustomerCreditService } from './customer-credit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController, CustomerCreditController],
  providers: [CustomersService, CustomerCreditService],
  exports: [CustomersService, CustomerCreditService],
})
export class CustomersModule {}
