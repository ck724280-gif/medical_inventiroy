import { Module } from '@nestjs/common';
import { PartyPricingService } from './party-pricing.service';
import { PartyPricingController } from './party-pricing.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PartyPricingController],
  providers: [PartyPricingService],
  exports: [PartyPricingService],
})
export class PartyPricingModule {}
