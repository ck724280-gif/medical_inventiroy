import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUDIT_ACTION_KEY,
  AUDIT_ENTITY_KEY,
} from '../decorators/auditable.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const entity = this.reflector.getAllAndOverride<string>(AUDIT_ENTITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action || !entity) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const deviceInfo = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const entityId = responseBody?.id || request.params?.id || null;
          const sanitizedNewValue = this.sanitizeAuditPayload(request.body);

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id || null,
              action,
              entity,
              entityId: entityId ? String(entityId) : null,
              newValue: sanitizedNewValue || null,
              ipAddress: ipAddress ? String(ipAddress) : null,
              deviceInfo: deviceInfo ? String(deviceInfo) : null,
            },
          });
        } catch (err) {
          // Never let audit log creation break the actual request
          console.error('Failed to create audit log entry:', err);
        }
      })
    );
  }

  private sanitizeAuditPayload(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'creditCard'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeAuditPayload(sanitized[key]);
      }
    }
    return sanitized;
  }
}
