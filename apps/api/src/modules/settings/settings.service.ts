import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateBusinessSettingsDto,
  UpdateBusinessBrandingDto,
  UpdateReceiptTemplateDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getBusinessSettings() {
    let settings = await this.prisma.businessSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.businessSettings.create({
        data: { id: 'default' },
      });
    }

    return settings;
  }

  async updateBusinessSettings(dto: UpdateBusinessSettingsDto) {
    return this.prisma.businessSettings.upsert({
      where: { id: 'default' },
      update: dto as any,
      create: { id: 'default', ...dto } as any,
    });
  }

  async getBranding() {
    let branding = await this.prisma.businessBranding.findUnique({
      where: { id: 'default' },
    });

    if (!branding) {
      branding = await this.prisma.businessBranding.create({
        data: { id: 'default' },
      });
    }

    return branding;
  }

  async updateBranding(dto: UpdateBusinessBrandingDto) {
    return this.prisma.businessBranding.upsert({
      where: { id: 'default' },
      update: dto as any,
      create: { id: 'default', ...dto } as any,
    });
  }

  async getReceiptTemplate() {
    const template = await this.prisma.receiptTemplate.findFirst({
      where: { isDefault: true },
    });

    if (!template) {
      return this.prisma.receiptTemplate.create({
        data: {
          name: 'Default 58mm Receipt',
          paperWidth: '58mm',
          isDefault: true,
        },
      });
    }

    return template;
  }

  async updateReceiptTemplate(dto: UpdateReceiptTemplateDto) {
    const defaultTemplate = await this.getReceiptTemplate();
    return this.prisma.receiptTemplate.update({
      where: { id: defaultTemplate.id },
      data: dto as any,
    });
  }

  async getPublicBusinessInfo() {
    const [settings, branding] = await Promise.all([
      this.getBusinessSettings(),
      this.getBranding(),
    ]);

    return {
      name: settings.name,
      logo: settings.logo,
      favicon: settings.favicon,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      country: settings.country,
      pinZip: settings.pinZip,
      phone: settings.phone,
      altPhone: settings.altPhone,
      email: settings.email,
      website: settings.website,
      gstNumber: settings.gstNumber,
      pharmacyLicense: settings.pharmacyLicense,
      currencyCode: settings.currencyCode,
      currencySymbol: settings.currencySymbol,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      loginBranding: branding.loginBranding,
    };
  }
}
