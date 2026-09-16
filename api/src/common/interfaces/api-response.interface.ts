/**
 * Frontend har doim shu ikki formatdan birini oladi — boshqasini emas.
 */

/** Muvaffaqiyatli javob */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Xato javobi */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Controller qo'shimcha `meta` qaytarishi kerak bo'lsa (masalan sahifalash),
 * javobni shu klassga o'raydi. Aks holda oddiy qiymat qaytaraveradi —
 * ResponseInterceptor uni o'zi `{ data }` ichiga soladi.
 */
export class ApiPayload<T> {
  constructor(
    readonly data: T,
    readonly meta?: Record<string, unknown>,
  ) {}
}
