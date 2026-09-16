import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiPayload,
  type ApiSuccessResponse,
} from '../interfaces/api-response.interface';

/**
 * Barcha muvaffaqiyatli javoblarni bir xil formatga soladi:
 *
 *   { "data": ... }                      — oddiy holat
 *   { "data": [...], "meta": { ... } }   — controller ApiPayload qaytarganda
 *
 * Sabab: frontend har bir endpoint uchun alohida format o'ylamasin.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T | ApiPayload<T>,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | ApiPayload<T>>,
  ): Observable<ApiSuccessResponse<T>> {
    return next
      .handle()
      .pipe(
        map((value) =>
          value instanceof ApiPayload
            ? { data: value.data, meta: value.meta }
            : { data: value },
        ),
      );
  }
}
