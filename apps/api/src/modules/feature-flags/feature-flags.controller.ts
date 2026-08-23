import { Controller, Get, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /** GET /feature-flags/branch/:branchId — Get all flags for a branch (§20) */
  @Get('branch/:branchId')
  getBranchFlags(@Param('branchId') branchId: string) {
    return this.featureFlagsService.getBranchFlags(branchId);
  }

  /** PUT /feature-flags/branch/:branchId/:featureKey — Set single flag (§20) */
  @Put('branch/:branchId/:featureKey')
  setFlag(
    @Param('branchId') branchId: string,
    @Param('featureKey') featureKey: string,
    @Body('isEnabled') isEnabled: boolean,
    @Request() req: any,
  ) {
    return this.featureFlagsService.setFlag(branchId, featureKey, isEnabled, req.user.id);
  }

  /** PUT /feature-flags/branch/:branchId/bulk — Bulk update flags (§20) */
  @Put('branch/:branchId/bulk')
  bulkSetFlags(
    @Param('branchId') branchId: string,
    @Body() flags: Record<string, boolean>,
    @Request() req: any,
  ) {
    return this.featureFlagsService.bulkSetFlags(branchId, flags, req.user.id);
  }

  /** GET /feature-flags/all-branches — Super Admin view all branches (§85) */
  @Get('all-branches')
  getAllBranchesFlags() {
    return this.featureFlagsService.getAllBranchesFlags();
  }
}
