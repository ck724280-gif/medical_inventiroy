import {
  Controller,
  Get,
  Patch,
  Body,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateBusinessSettingsDto,
  UpdateBusinessBrandingDto,
  UpdateReceiptTemplateDto,
} from './dto/update-settings.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Get('public')
  async getPublicInfo() {
    return this.settingsService.getPublicBusinessInfo();
  }

  @Get('business')
  async getBusinessSettings() {
    return this.settingsService.getBusinessSettings();
  }

  @Patch('business')
  @RequirePermissions('settings.manage')
  @Auditable('update_business_settings', 'BusinessSettings')
  async updateBusinessSettings(@Body() dto: UpdateBusinessSettingsDto) {
    return this.settingsService.updateBusinessSettings(dto);
  }

  @Get('branding')
  async getBranding() {
    return this.settingsService.getBranding();
  }

  @Patch('branding')
  @RequirePermissions('settings.manage')
  @Auditable('update_branding', 'BusinessBranding')
  async updateBranding(@Body() dto: UpdateBusinessBrandingDto) {
    return this.settingsService.updateBranding(dto);
  }

  @Get('receipt-template')
  async getReceiptTemplate() {
    return this.settingsService.getReceiptTemplate();
  }

  @Patch('receipt-template')
  @RequirePermissions('settings.manage')
  @Auditable('update_receipt_template', 'ReceiptTemplate')
  async updateReceiptTemplate(@Body() dto: UpdateReceiptTemplateDto) {
    return this.settingsService.updateReceiptTemplate(dto);
  }
}
