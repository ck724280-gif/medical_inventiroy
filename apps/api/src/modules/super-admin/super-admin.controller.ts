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
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('super_admin.access')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  async getOverview() {
    return this.superAdminService.getOrganizationOverview();
  }

  @Get('branches-matrix')
  async getBranchesMatrix() {
    return this.superAdminService.getBranchesMatrix();
  }

  @Get('staff')
  async getStaffDirectory(
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('search') search?: string
  ) {
    return this.superAdminService.getStaffDirectory(branchId, role, search);
  }

  @Post('staff/:userId/transfer')
  @HttpCode(HttpStatus.OK)
  async transferStaff(
    @Param('userId', UUIDValidationPipe) userId: string,
    @Body('targetBranchId', UUIDValidationPipe) targetBranchId: string
  ) {
    return this.superAdminService.transferStaff(userId, targetBranchId);
  }

  @Post('switch-context')
  @HttpCode(HttpStatus.OK)
  async switchContext(
    @CurrentUser('id') currentUserId: string,
    @Body('targetBranchId', UUIDValidationPipe) targetBranchId: string
  ) {
    return this.superAdminService.switchContext(currentUserId, targetBranchId);
  }
}
