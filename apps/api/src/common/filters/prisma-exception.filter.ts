import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'A database error occurred';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        const field = target.length > 0 ? target.join(', ') : 'field';
        message = `A record with this ${field} already exists.`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested record was not found or has already been deleted.';
        break;
      }
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        const field = (exception.meta?.field_name as string) || 'related record';
        message = `Cannot complete operation because the referenced ${field} is invalid or in use.`;
        break;
      }
      case 'P2014': {
        status = HttpStatus.BAD_REQUEST;
        message = 'The change you are trying to make would violate the required relation between records.';
        break;
      }
      default: {
        this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`);
        message = process.env.NODE_ENV === 'development'
          ? `Database error: ${exception.message}`
          : 'A database constraint error occurred.';
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
