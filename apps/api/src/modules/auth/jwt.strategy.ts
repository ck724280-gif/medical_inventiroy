import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'medical-erp-dev-jwt-secret-key-at-least-32-characters',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
        branches: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is deactivated or invalid');
    }

    // Flatten roles and permissions
    const roles: string[] = [];
    const permissionSet = new Set<string>();

    for (const userRole of user.roles) {
      if (userRole.role.isActive) {
        roles.push(userRole.role.name);
        for (const rolePerm of userRole.role.permissions) {
          permissionSet.add(rolePerm.permission.code);
        }
      }
    }

    const branches = user.branches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
      code: b.branch.code,
      isDefault: b.branch.isDefault,
    }));

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: Array.from(permissionSet),
      branches,
    };
  }
}
