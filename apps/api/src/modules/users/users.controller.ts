import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  @Auditable('update_profile', 'User')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto
  ) {
    // Regular users can only update personal contact details
    return this.usersService.update(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
    });
  }

  @Get()
  @RequirePermissions('user.manage')
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('user.manage')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('user.manage')
  @Auditable('create_user', 'User')
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  @Auditable('update_user', 'User')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user.manage')
  @Auditable('deactivate_user', 'User')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
