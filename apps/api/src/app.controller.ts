import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getApiRoot() {
    return {
      status: 'ok',
      app: 'MedCare Pharmacy ERP & POS API',
      version: '1.0.0',
      message: 'API is online and operational.',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
