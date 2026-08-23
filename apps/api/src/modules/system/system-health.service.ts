import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemHealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full system health report (§40) */
  async getSystemHealth() {
    const [
      dbHealth,
      activeSessions,
      recentErrors,
      pendingJobs,
      failedJobs,
      lastBackup,
    ] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.getActiveSessionsCount(),
      this.getRecentErrorCount(),
      this.getPendingJobsCount(),
      this.getFailedJobsCount(),
      this.getLastBackupStatus(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      api: { status: 'HEALTHY', message: 'API is responding normally' },
      database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'ERROR', latencyMs: null },
      activeSessions: activeSessions.status === 'fulfilled' ? activeSessions.value : 0,
      recentErrors: recentErrors.status === 'fulfilled' ? recentErrors.value : 0,
      pendingJobs: pendingJobs.status === 'fulfilled' ? pendingJobs.value : 0,
      failedJobs: failedJobs.status === 'fulfilled' ? failedJobs.value : 0,
      lastBackup: lastBackup.status === 'fulfilled' ? lastBackup.value : null,
    };
  }

  /** Check database health and latency (§40) */
  async checkDatabaseHealth(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return {
        status: latencyMs < 100 ? 'HEALTHY' : latencyMs < 500 ? 'DEGRADED' : 'SLOW',
        latencyMs,
      };
    } catch {
      return { status: 'ERROR', latencyMs: -1 };
    }
  }

  /** Active sessions count (§40) */
  async getActiveSessionsCount(): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /** Recent error count (§41) */
  async getRecentErrorCount(minutes = 60): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.errorLog.count({ where: { createdAt: { gte: since } } });
  }

  /** Pending background jobs (§40) */
  async getPendingJobsCount(): Promise<number> {
    return this.prisma.backgroundJob.count({ where: { status: 'PENDING' } });
  }

  /** Failed jobs (§40) */
  async getFailedJobsCount(): Promise<number> {
    return this.prisma.backgroundJob.count({ where: { status: 'FAILED' } });
  }

  /** Last backup status (§40) */
  async getLastBackupStatus() {
    return this.prisma.backupRecord.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, status: true, sizeBytes: true, createdAt: true },
    });
  }

  /** Log an error (§41) */
  async logError(params: {
    requestId?: string;
    endpoint?: string;
    userId?: string;
    branchId?: string;
    errorCategory?: string;
    safeMessage: string;
    stackTrace?: string;
    statusCode?: number;
  }) {
    return this.prisma.errorLog.create({
      data: {
        requestId: params.requestId,
        endpoint: params.endpoint,
        userId: params.userId,
        branchId: params.branchId,
        errorCategory: params.errorCategory,
        safeMessage: params.safeMessage,
        stackTrace: params.stackTrace, // NEVER sent to client
        statusCode: params.statusCode,
      },
    });
  }

  /** Get recent errors for Super Admin (§41, §85) */
  async getRecentErrors(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.errorLog.count(),
      this.prisma.errorLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          requestId: true,
          endpoint: true,
          userId: true,
          branchId: true,
          errorCategory: true,
          safeMessage: true,
          statusCode: true,
          createdAt: true,
          // stackTrace: NOT selected — never exposed via API
        },
      }),
    ]);
    return { total, page, limit, items };
  }

  /** Get performance stats from audit logs (§40) */
  async getPerformanceStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRequests, errorCount, activeUsers] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.errorLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.refreshToken.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);

    return {
      last24Hours: {
        totalAuditEntries: totalRequests,
        errorCount,
        errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0.00',
      },
      activeUsers,
    };
  }
}
