import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { getRequestId } from '../middleware/request-id.middleware';

/**
 * Har bir so'rovni yozib boradi: metod, manzil, status, davomiylik, request ID.
 * Xato holatini AllExceptionsFilter yozadi — bu yerda takrorlanmaydi.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        this.logger.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms [${getRequestId(req) ?? '-'}]`,
        );
      }),
    );
  }
}
