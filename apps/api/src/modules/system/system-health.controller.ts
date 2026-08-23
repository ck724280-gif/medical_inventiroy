import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('system')
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  /** GET /system/health — Full system health (§40) */
  @Get('health')
  getSystemHealth() {
    return this.systemHealthService.getSystemHealth();
  }

  /** GET /system/health/db — Database health + latency (§40) */
  @Get('health/db')
  checkDatabaseHealth() {
    return this.systemHealthService.checkDatabaseHealth();
  }

  /** GET /system/errors — Recent errors for Super Admin (§41) */
  @Get('errors')
  getRecentErrors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.systemHealthService.getRecentErrors(page, limit);
  }

  /** GET /system/performance — Performance stats (§40, §77) */
  @Get('performance')
  getPerformanceStats() {
    return this.systemHealthService.getPerformanceStats();
  }
}
