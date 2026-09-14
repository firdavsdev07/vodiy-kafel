import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../prisma';
import type { ApiErrorResponse } from '../interfaces/api-response.interface';
import { getRequestId } from '../middleware/request-id.middleware';

/** 5xx chegarasi — enum emas, oddiy son (raqam bilan solishtirish uchun). */
const SERVER_ERROR_FROM: number = HttpStatus.INTERNAL_SERVER_ERROR;

interface Normalized {
  status: number;
  error: string;
  message: string | string[];
}

/**
 * Barcha xatolarni bitta formatga soladi.
 *
 * Muhim: ichki tafsilotlar (stack, SQL, Prisma matni) mijozga CHIQMAYDI —
 * ular faqat serverda log qilinadi. Mijoz request ID ni ko'radi va
 * shikoyat qilganda o'sha ID bo'yicha log topiladi.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { status, error, message } = this.normalize(exception);

    const body: ApiErrorResponse = {
      statusCode: status,
      error,
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };

    this.log(exception, req, status, body.requestId);
    res.status(status).json(body);
  }

  private normalize(exception: unknown): Normalized {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnown(exception);
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'So‘rov ma’lumotlari noto‘g‘ri',
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Serverda kutilmagan xatolik yuz berdi',
    };
  }

  private fromHttpException(exception: HttpException): Normalized {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    // ValidationPipe obyekt qaytaradi: { statusCode, error, message: string[] }
    if (typeof payload === 'object' && payload !== null) {
      const p = payload as Record<string, unknown>;
      return {
        status,
        error: typeof p.error === 'string' ? p.error : exception.name,
        message: (p.message ?? exception.message) as string | string[],
      };
    }

    return { status, error: exception.name, message: String(payload) };
  }

  /** Prisma xato kodlari → HTTP status. https://pris.ly/d/error-reference */
  private fromPrismaKnown(
    exception: Prisma.PrismaClientKnownRequestError,
  ): Normalized {
    switch (exception.code) {
      case 'P2002': // unique constraint
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Bunday yozuv allaqachon mavjud',
        };
      case 'P2025': // topilmadi
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Yozuv topilmadi',
        };
      case 'P2003': // foreign key
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Bog‘liq yozuv topilmadi',
        };
      case 'P2014': // bog'liqlikni buzadi
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Bu yozuv boshqa yozuvlarga bog‘langan',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Ma’lumotlar bazasi xatoligi',
        };
    }
  }

  /** Log uchun xatoning qisqa tavsifi (Prisma kodi bilan). */
  private describe(exception: unknown): string {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const text = exception.message.replace(/\s+/g, ' ').trim();
      return `Prisma ${exception.code}: ${text || '(matn yo‘q)'}`;
    }
    if (exception instanceof Error) {
      return exception.message || exception.name;
    }
    return String(exception);
  }

  private log(
    exception: unknown,
    req: Request,
    status: number,
    requestId?: string,
  ): void {
    const where = `${req.method} ${req.originalUrl} [${requestId ?? '-'}]`;

    // 5xx — kutilmagan xato, stack bilan. 4xx — odatiy holat, qisqa yozuv.
    if (status >= SERVER_ERROR_FROM) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${where} → ${status}: ${this.describe(exception)}`,
        stack,
      );
    } else {
      this.logger.warn(`${where} → ${status}`);
    }
  }
}
