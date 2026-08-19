import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartyPricingService } from './party-pricing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('party-pricing')
export class PartyPricingController {
  constructor(private readonly partyPricingService: PartyPricingService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.partyPricingService.create(body, user?.id);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.partyPricingService.findAll(query);
  }

  @Get('effective')
  findEffective(@Query() query: any) {
    return this.partyPricingService.findEffective(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partyPricingService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.partyPricingService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partyPricingService.remove(id);
  }
}
