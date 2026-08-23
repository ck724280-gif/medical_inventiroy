import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;
    
    if (originalUrl === '/api/health' || originalUrl === '/') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startTime;
        
        if (durationMs > 300) {
          this.logger.warn(`[SLOW] ${method} ${originalUrl} - ${durationMs}ms`);
        } else {
          this.logger.log(`${method} ${originalUrl} - ${durationMs}ms`);
        }
      }),
    );
  }
}
