import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import {
  UpdateBusinessSettingsDto,
  UpdateBusinessBrandingDto,
  UpdateReceiptTemplateDto,
  UpdateAiConfigDto,
  TestAiConnectionDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService
  ) {}

  private readonly CACHE_KEY_PUBLIC_INFO = 'settings:public_info';
  private readonly CACHE_KEY_SETTINGS = 'settings:business_settings';
  private readonly CACHE_KEY_BRANDING = 'settings:branding';

  async getBusinessSettings() {
    return this.cache.getOrSet(this.CACHE_KEY_SETTINGS, async () => {
      let settings = await this.prisma.businessSettings.findUnique({
        where: { id: 'default' },
      });

      if (!settings) {
        settings = await this.prisma.businessSettings.create({
          data: { id: 'default' },
        });
      }

      return settings;
    }, 600000); // 10 min TTL
  }

  async updateBusinessSettings(dto: UpdateBusinessSettingsDto) {
    const updated = await this.prisma.businessSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(dto as any),
        updatedAt: new Date(),
      },
      create: { id: 'default', ...dto } as any,
    });

    // Keep BusinessBranding synchronized if logo was passed
    if (dto.logo) {
      await this.prisma.businessBranding.upsert({
        where: { id: 'default' },
        update: { invoiceLogo: dto.logo, updatedAt: new Date() },
        create: { id: 'default', invoiceLogo: dto.logo },
      });
    }

    // Invalidate cache immediately
    this.cache.invalidatePattern('settings:');

    return updated;
  }

  async getBranding() {
    return this.cache.getOrSet(this.CACHE_KEY_BRANDING, async () => {
      let branding = await this.prisma.businessBranding.findUnique({
        where: { id: 'default' },
      });

      if (!branding) {
        branding = await this.prisma.businessBranding.create({
          data: { id: 'default' },
        });
      }

      return branding;
    }, 600000);
  }

  async updateBranding(dto: UpdateBusinessBrandingDto) {
    const updated = await this.prisma.businessBranding.upsert({
      where: { id: 'default' },
      update: {
        ...(dto as any),
        updatedAt: new Date(),
      },
      create: { id: 'default', ...dto } as any,
    });

    // If invoiceLogo was updated, sync to businessSettings.logo as single source of truth
    if (dto.invoiceLogo) {
      await this.prisma.businessSettings.upsert({
        where: { id: 'default' },
        update: { logo: dto.invoiceLogo, updatedAt: new Date() },
        create: { id: 'default', logo: dto.invoiceLogo },
      });
    }

    // Invalidate cache immediately
    this.cache.invalidatePattern('settings:');

    return updated;
  }

  async updateLogo(logoData: string) {
    if (!logoData || typeof logoData !== 'string') {
      throw new BadRequestException('Invalid logo data provided.');
    }

    // Validate size if data URL
    if (logoData.startsWith('data:')) {
      const isImage = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(logoData);
      if (!isImage) {
        throw new BadRequestException('Logo must be a valid image (PNG, JPG, WebP, SVG).');
      }
      // Check approximate size (max ~2MB)
      if (logoData.length > 3 * 1024 * 1024) {
        throw new BadRequestException('Logo image size exceeds 2MB limit.');
      }
    }

    const now = new Date();

    const [settings] = await Promise.all([
      this.prisma.businessSettings.upsert({
        where: { id: 'default' },
        update: { logo: logoData, updatedAt: now },
        create: { id: 'default', logo: logoData },
      }),
      this.prisma.businessBranding.upsert({
        where: { id: 'default' },
        update: { invoiceLogo: logoData, updatedAt: now },
        create: { id: 'default', invoiceLogo: logoData },
      }),
    ]);

    // Invalidate cache immediately
    this.cache.invalidatePattern('settings:');

    return {
      success: true,
      logoUrl: logoData,
      updatedAt: now.toISOString(),
      timestamp: now.getTime(),
    };
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
    const dataToUpdate: any = { ...dto };
    if (dto.displayFields && typeof dto.displayFields === 'object') {
      dataToUpdate.displayFields = JSON.stringify(dto.displayFields);
    }
    return this.prisma.receiptTemplate.update({
      where: { id: defaultTemplate.id },
      data: dataToUpdate,
    });
  }

  async getPublicBusinessInfo() {
    return this.cache.getOrSet(this.CACHE_KEY_PUBLIC_INFO, async () => {
      const [settings, branding] = await Promise.all([
        this.getBusinessSettings(),
        this.getBranding(),
      ]);

      // Construct cache-busted logo if it's a relative/HTTP path
      let cacheBustedLogo = settings.logo || branding.invoiceLogo || null;
      if (cacheBustedLogo && !cacheBustedLogo.startsWith('data:') && !cacheBustedLogo.includes('?v=')) {
        const v = settings.updatedAt ? settings.updatedAt.getTime() : Date.now();
        cacheBustedLogo = `${cacheBustedLogo}${cacheBustedLogo.includes('?') ? '&' : '?'}v=${v}`;
      }

      return {
        name: settings.name || 'MedCare Pharmacy',
        logo: cacheBustedLogo,
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
        updatedAt: settings.updatedAt,
      };
    }, 300000); // 5 min TTL
  }

  /**
   * §P7: Get AI Co-Pilot Configuration for Admin Panel
   */
  async getAiConfig() {
    const settings = await this.getBusinessSettings();
    const rawKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
    
    // Mask key for safety (e.g., AIzaSy...xxxx)
    const maskedKey = rawKey
      ? `${rawKey.slice(0, 6)}••••••••••••••••${rawKey.slice(-4)}`
      : '';

    return {
      hasKey: !!rawKey,
      geminiApiKey: maskedKey,
      isEnvKey: !settings.geminiApiKey && !!process.env.GEMINI_API_KEY,
      aiModelName: settings.aiModelName || 'gemini-1.5-flash',
      aiEnabled: settings.aiEnabled !== false,
      aiTemperature: settings.aiTemperature ?? 0.2,
      aiSystemPrompt: settings.aiSystemPrompt || '',
    };
  }

  /**
   * §P7: Update AI Co-Pilot Configuration (Super Admin)
   */
  async updateAiConfig(dto: UpdateAiConfigDto) {
    const dataToUpdate: any = { updatedAt: new Date() };

    if (dto.geminiApiKey !== undefined && !dto.geminiApiKey.includes('••••')) {
      dataToUpdate.geminiApiKey = dto.geminiApiKey.trim() || null;
    }
    if (dto.aiModelName !== undefined) dataToUpdate.aiModelName = dto.aiModelName;
    if (dto.aiEnabled !== undefined) dataToUpdate.aiEnabled = dto.aiEnabled;
    if (dto.aiTemperature !== undefined) dataToUpdate.aiTemperature = Number(dto.aiTemperature);
    if (dto.aiSystemPrompt !== undefined) dataToUpdate.aiSystemPrompt = dto.aiSystemPrompt;

    const updated = await this.prisma.businessSettings.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: { id: 'default', ...dataToUpdate },
    });

    this.cache.invalidatePattern('settings:');
    return this.getAiConfig();
  }

  /**
   * §P7: Test Gemini API Connection
   */
  async testAiConnection(dto: TestAiConnectionDto) {
    const settings = await this.getBusinessSettings();
    const apiKey =
      (dto.geminiApiKey && !dto.geminiApiKey.includes('••••'))
        ? dto.geminiApiKey.trim()
        : settings.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new BadRequestException('No Gemini API Key provided or configured.');
    }

    const modelName = dto.aiModelName || settings.aiModelName || 'gemini-1.5-flash';
    const start = Date.now();

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent('Respond with "CONNECTED" if you can read this.');
      const response = result.response.text();
      const latencyMs = Date.now() - start;

      return {
        success: true,
        status: 'CONNECTED',
        model: modelName,
        latencyMs,
        response: response.trim(),
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        model: modelName,
        error: err.message || 'Connection failed',
      };
    }
  }
}
