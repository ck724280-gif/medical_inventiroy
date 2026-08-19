import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  async findAll(@Query() query: any) {
    return this.auditService.findAll(query);
  }
}
