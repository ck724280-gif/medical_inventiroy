import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auditable } from '../../common/decorators/auditable.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Auditable('login', 'User')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Auditable('logout', 'User')
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken?: string
  ) {
    return this.authService.logout(userId, refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Auditable('change_password', 'User')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
