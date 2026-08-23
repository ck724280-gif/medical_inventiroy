import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type JobType =
  | 'REPORT_EXPORT'
  | 'PDF_GENERATE'
  | 'BULK_IMPORT'
  | 'NOTIFICATION'
  | 'ANALYTICS';

@Injectable()
export class BackgroundJobsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new background job record (§29) */
  async createJob(
    jobType: JobType,
    requestedBy: string,
    payload: Record<string, any>,
    branchId?: string,
  ) {
    const job = await this.prisma.backgroundJob.create({
      data: {
        jobType,
        requestedBy,
        branchId,
        payload: JSON.stringify(payload),
        status: 'PENDING',
        progress: 0,
      },
    });

    // In production: push to job queue (Bull, BullMQ, etc.)
    // For now: simulate async processing
    this.processJobAsync(job.id, jobType, payload).catch(() => {});

    return { jobId: job.id, status: 'PENDING', message: 'Job created. You will be notified on completion.' };
  }

  /** Get job status (§29) */
  async getJobStatus(jobId: string, userId: string) {
    const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found.');
    return job;
  }

  /** List all jobs for a user (§29) */
  async getUserJobs(requestedBy: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.backgroundJob.count({ where: { requestedBy } }),
      this.prisma.backgroundJob.findMany({
        where: { requestedBy },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          jobType: true,
          status: true,
          progress: true,
          resultUrl: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
    ]);
    return { total, page, limit, items };
  }

  /** Mark job as running (§29) */
  async markRunning(jobId: string) {
    return this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date(), progress: 10 },
    });
  }

  /** Mark job as completed (§29) */
  async markCompleted(jobId: string, resultUrl: string) {
    return this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date(), progress: 100, resultUrl },
    });
  }

  /** Mark job as failed (§29) */
  async markFailed(jobId: string, errorMessage: string) {
    return this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage },
    });
  }

  /** Update job progress (§29) */
  async updateProgress(jobId: string, progress: number) {
    return this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: { progress: Math.min(99, Math.max(0, progress)) },
    });
  }

  /** Internal: async job processor simulation (§29, §78 graceful degradation) */
  private async processJobAsync(
    jobId: string,
    jobType: JobType,
    payload: Record<string, any>,
  ) {
    try {
      await this.markRunning(jobId);

      // Simulate processing time per job type
      switch (jobType) {
        case 'REPORT_EXPORT':
          await this.processReportExport(jobId, payload);
          break;
        case 'BULK_IMPORT':
          await this.processBulkImport(jobId, payload);
          break;
        default:
          // Generic processing
          await new Promise((resolve) => setTimeout(resolve, 500));
          await this.markCompleted(jobId, '');
      }
    } catch (error) {
      await this.markFailed(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async processReportExport(jobId: string, payload: Record<string, any>) {
    // Simulate report generation in background (§89)
    await this.updateProgress(jobId, 30);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.updateProgress(jobId, 60);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.updateProgress(jobId, 90);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const resultUrl = `/reports/downloads/${jobId}.csv`;
    await this.markCompleted(jobId, resultUrl);
  }

  private async processBulkImport(jobId: string, payload: Record<string, any>) {
    await this.updateProgress(jobId, 50);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.markCompleted(jobId, '');
  }
}
