import { Controller, Get, Post, Body, Param, Query, DefaultValuePipe, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BackgroundJobsService } from './background-jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class BackgroundJobsController {
  constructor(private readonly backgroundJobsService: BackgroundJobsService) {}

  /** POST /jobs — Create a new background job (§29) */
  @Post()
  createJob(
    @Body('jobType') jobType: any,
    @Body('payload') payload: Record<string, any>,
    @Body('branchId') branchId: string,
    @Request() req: any,
  ) {
    return this.backgroundJobsService.createJob(jobType, req.user.id, payload || {}, branchId);
  }

  /** GET /jobs/my — List jobs for current user (§29) */
  @Get('my')
  getUserJobs(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.backgroundJobsService.getUserJobs(req.user.id, page, limit);
  }

  /** GET /jobs/:id — Get job status (§29) */
  @Get(':id')
  getJobStatus(@Param('id') id: string, @Request() req: any) {
    return this.backgroundJobsService.getJobStatus(id, req.user.id);
  }
}
