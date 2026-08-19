import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('backup')
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Get('history')
  @RequirePermissions('backup.manage')
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Post('create')
  @RequirePermissions('backup.manage')
  @Auditable('create_database_backup', 'Database')
  async createBackup() {
    return this.backupService.createBackup();
  }
}
