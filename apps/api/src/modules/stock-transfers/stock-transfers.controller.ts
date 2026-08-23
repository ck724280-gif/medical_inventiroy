import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StockTransfersService, CreateStockTransferDto } from './stock-transfers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('stock-transfers')
@UseGuards(JwtAuthGuard)
export class StockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Get()
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string
  ) {
    return this.stockTransfersService.findAll(branchId, status);
  }

  @Get(':id')
  async findOne(@Param('id', UUIDValidationPipe) id: string) {
    return this.stockTransfersService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser('id') userId: string
  ) {
    return this.stockTransfersService.create(dto, userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', UUIDValidationPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.stockTransfersService.approve(id, userId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', UUIDValidationPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string
  ) {
    return this.stockTransfersService.reject(id, userId, reason);
  }

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  async dispatch(
    @Param('id', UUIDValidationPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.stockTransfersService.dispatch(id, userId);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id', UUIDValidationPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.stockTransfersService.receive(id, userId);
  }
}
