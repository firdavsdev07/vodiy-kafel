import type { Schema } from './types';

type ApiErrorBody = Schema<'ApiErrorDto'>;

/**
 * Backend xatosi (ApiErrorDto) yoki tarmoq xatosi — yagona klass (D-004).
 * `requestId` — foydalanuvchi xato haqida xabar berganda log'dan so'rovni
 * aniq topish uchun; UI uni ko'rsatadi.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  /** Validatsiya xatosida bir nechta matn bo'ladi. */
  readonly messages: string[];
  readonly error: string;
  readonly path: string | undefined;
  readonly requestId: string | undefined;

  constructor(init: {
    statusCode: number;
    messages: string[];
    error: string;
    path?: string;
    requestId?: string;
  }) {
    super(init.messages.join('; ') || init.error);
    this.name = 'ApiError';
    this.statusCode = init.statusCode;
    this.messages = init.messages;
    this.error = init.error;
    this.path = init.path;
    this.requestId = init.requestId;
  }

  /** statusCode 0 — server bilan aloqa yo'q (tarmoq, CORS, server o'chiq). */
  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  static network(cause: unknown): ApiError {
    const error = new ApiError({
      statusCode: 0,
      messages: ['Server bilan aloqa yo‘q. Internetni tekshirib, qayta urinib ko‘ring.'],
      error: 'Network Error',
    });
    (error as { cause?: unknown }).cause = cause;
    return error;
  }

  /** Javob tanasi ApiErrorDto bo'lmasa ham (proxy HTML, bo'sh tana) — xato yo'qolmaydi. */
  static fromResponse(response: Response, body: unknown): ApiError {
    const dto = isApiErrorBody(body) ? body : undefined;
    const message = dto?.message;
    return new ApiError({
      statusCode: response.status,
      messages: Array.isArray(message)
        ? message
        : message
          ? [message]
          : [response.statusText || `HTTP ${response.status}`],
      error: dto?.error ?? (response.statusText || 'Error'),
      path: dto?.path,
      requestId: dto?.requestId ?? response.headers.get('x-request-id') ?? undefined,
    });
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'statusCode' in body &&
    'message' in body
  );
}
