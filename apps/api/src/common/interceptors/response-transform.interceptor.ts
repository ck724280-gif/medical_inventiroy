import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * §42 Request ID / Trace ID Interceptor
 * §73 API Response Standardization
 *
 * Attaches a unique REQ-xxxxxxxx to every request and wraps all responses
 * in a standard { success, data, metadata, requestId } envelope.
 * Stacks trace IDs are NEVER sent to clients — only the requestId reference.
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // §42: Generate request ID (REQ-xxxxxxxx format)
    const requestId = request.headers['x-request-id'] || `REQ-${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Attach to request for use in services (logging, error tracking)
    request.requestId = requestId;

    // Set response header so clients can reference it
    response.setHeader('X-Request-ID', requestId);

    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped (e.g., from a service that returns { success, data }), pass through
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return { ...data, requestId };
        }

        // §73: Standard success response envelope
        return {
          success: true,
          data,
          requestId,
        };
      }),
    );
  }
}
