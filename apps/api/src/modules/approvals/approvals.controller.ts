import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalRequestDto, ResolveApprovalDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  /** POST /approvals — Create a new approval request (§12) */
  @Post()
  create(@Body() dto: CreateApprovalRequestDto, @Request() req: any) {
    return this.approvalsService.createRequest(dto, req.user.id);
  }

  /** GET /approvals — List all approval requests (§12) */
  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.approvalsService.findAll(branchId, status, page, limit);
  }

  /** GET /approvals/:id — Get single approval request (§12) */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  /** PATCH /approvals/:id/resolve — Approve / Reject / Cancel (§12) */
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveApprovalDto, @Request() req: any) {
    return this.approvalsService.resolve(id, dto, req.user.id);
  }

  /** GET /approvals/pending-count — Dashboard widget (§18) */
  @Get('stats/pending-count')
  getPendingCount(@Query('branchId') branchId?: string) {
    return this.approvalsService.getPendingCount(branchId);
  }
}
