import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role.manage')
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermissions('role.manage')
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @RequirePermissions('role.manage')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions('role.manage')
  @Auditable('create_role', 'Role')
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('role.manage')
  @Auditable('update_role', 'Role')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('role.manage')
  @Auditable('delete_role', 'Role')
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
