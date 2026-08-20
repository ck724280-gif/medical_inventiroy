import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { BackupService, GoogleDriveConfig } from './backup.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';
import fs from 'fs';

@Controller('backup')
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Get('history')
  @RequirePermissions('backup.manage')
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Get('stats')
  @RequirePermissions('backup.manage')
  async getDatabaseStats() {
    return this.backupService.getDatabaseStats();
  }

  @Post('create')
  @RequirePermissions('backup.manage')
  @Auditable('create_database_backup', 'Database')
  async createBackup() {
    return this.backupService.createBackup();
  }

  @Get('download/:id')
  @RequirePermissions('backup.manage')
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const { filepath, filename } = this.backupService.getBackupFilePath(id);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }

  @Delete(':id')
  @RequirePermissions('backup.manage')
  @Auditable('delete_database_backup', 'Database')
  async deleteBackup(@Param('id') id: string) {
    return this.backupService.deleteBackup(id);
  }

  @Get('gdrive-config')
  @RequirePermissions('backup.manage')
  async getGdriveConfig() {
    return this.backupService.getGdriveConfig();
  }

  @Post('gdrive-config')
  @RequirePermissions('backup.manage')
  @Auditable('update_gdrive_config', 'Backup')
  async saveGdriveConfig(@Body() config: Partial<GoogleDriveConfig>) {
    return this.backupService.saveGdriveConfig(config);
  }

  @Post('upload-gdrive/:id')
  @RequirePermissions('backup.manage')
  @Auditable('upload_backup_gdrive', 'Database')
  async uploadToGoogleDrive(@Param('id') id: string) {
    return this.backupService.uploadToGoogleDrive(id);
  }
}
