import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Har bir so'rovga yagona ID beradi.
 *
 * Kelgan so'rovda allaqachon `x-request-id` bo'lsa (masalan frontend yoki
 * nginx qo'ygan) — o'sha saqlanadi, shunda log'lar zanjiri uzilmaydi.
 *
 * ID javob sarlavhasiga ham qo'yiladi: mijoz xato haqida shikoyat qilganda
 * shu ID bo'yicha log'dan aniq so'rovni topish mumkin.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof existing === 'string' && existing.length > 0
        ? existing
        : randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}

/** So'rovdan request ID ni olish — filter va interceptor uchun. */
export function getRequestId(req: Request): string | undefined {
  const value = req.headers?.[REQUEST_ID_HEADER];
  return typeof value === 'string' ? value : undefined;
}
