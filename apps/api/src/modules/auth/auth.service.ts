import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthTokens } from '@medical-inventory/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const { email, mobile, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          mobile ? { mobile } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account is temporarily locked due to multiple failed logins. Try again in ${waitMinutes} minute(s).`
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Verify Password with Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      const failedCount = user.failedLoginCount + 1;
      let lockedUntil: Date | null = null;

      // Lock account for 15 minutes after 5 consecutive failed attempts
      if (failedCount >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failedCount,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login counter on success & update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Extract roles and permissions
    const roles: string[] = [];
    const permissionSet = new Set<string>();

    for (const ur of user.roles) {
      if (ur.role.isActive) {
        roles.push(ur.role.name);
        for (const rp of ur.role.permissions) {
          permissionSet.add(rp.permission.code);
        }
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRATION || '15m',
    });

    // Create Refresh Token (7 days)
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const refreshTokenString = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: process.env.REFRESH_TOKEN_SECRET || 'medical-erp-dev-refresh-token-secret-key-32-chars',
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
      }
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenString,
        expiresAt: refreshTokenExpiresAt,
        deviceInfo: userAgent || null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.REFRESH_TOKEN_SECRET || 'medical-erp-dev-refresh-token-secret-key-32-chars',
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token is expired or revoked');
      }

      const user = storedToken.user;
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User is deactivated');
      }

      // Rotate Refresh Token (Revoke old token and issue new one)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      const payload = { sub: user.id, email: user.email };
      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRATION || '15m',
      });

      const newRefreshTokenString = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        {
          secret: process.env.REFRESH_TOKEN_SECRET || 'medical-erp-dev-refresh-token-secret-key-32-chars',
          expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
        }
      );

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshTokenString,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deviceInfo: storedToken.deviceInfo,
        },
      });

      const roles: string[] = [];
      const permissionSet = new Set<string>();

      for (const ur of user.roles) {
        if (ur.role.isActive) {
          roles.push(ur.role.name);
          for (const rp of ur.role.permissions) {
            permissionSet.add(rp.permission.code);
          }
        }
      }

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenString,
        expiresIn: 900,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
          permissions: Array.from(permissionSet),
        },
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all active refresh tokens for the user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all existing sessions
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Password changed successfully. Please log in with your new password.' };
  }
}
