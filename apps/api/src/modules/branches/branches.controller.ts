import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  UpdateBranchSettingsDto,
} from './dto/create-branch.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  async findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermissions('branch.manage')
  @Auditable('create_branch', 'Branch')
  async create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('branch.manage')
  @Auditable('update_branch', 'Branch')
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  // ── 24-Hour Grace Period Deletion Endpoints ───────────────

  @Post(':id/schedule-delete')
  async scheduleDelete(
    @Param('id') id: string,
    @Body() body: { email: string; password?: string; reason?: string }
  ) {
    return this.branchesService.scheduleBranchDeletion(id, body);
  }

  @Post(':id/restore')
  async restoreBranch(@Param('id') id: string) {
    return this.branchesService.restoreBranch(id);
  }

  @Post(':id/permanent-purge')
  async permanentPurge(
    @Param('id') id: string,
    @Body() body: { email: string; password?: string }
  ) {
    return this.branchesService.permanentPurge(id, body);
  }

  @Post('purge-expired')
  async purgeExpired() {
    return this.branchesService.purgeExpiredBranches();
  }

  // Legacy secure-delete alias -> now triggers 24-hour grace period delete
  @Post(':id/secure-delete')
  async secureDelete(
    @Param('id') id: string,
    @Body() body: { email: string; password?: string; reason?: string }
  ) {
    return this.branchesService.scheduleBranchDeletion(id, body);
  }

  @Delete(':id')
  @RequirePermissions('branch.manage')
  @Auditable('delete_branch', 'Branch')
  async delete(@Param('id') id: string) {
    return this.branchesService.delete(id);
  }

  @Patch(':id/settings')
  @RequirePermissions('branch.manage')
  @Auditable('update_branch_settings', 'BranchSettings')
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateBranchSettingsDto
  ) {
    return this.branchesService.updateSettings(id, dto);
  }
}
