import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { errorMessage, errorRequestId } from './error-message';

const err = (statusCode: number, messages = ['Serverdan matn'], requestId?: string) =>
  new ApiError({ statusCode, messages, error: 'x', requestId });

describe('errorMessage (D-008)', () => {
  it('4xx — backend matni (validatsiya ro‘yxati qatorma-qator)', () => {
    expect(errorMessage(err(409, ['Omborda yetarli emas']))).toBe('Omborda yetarli emas');
    expect(errorMessage(err(400, ['nom bo‘sh', 'narx musbat']))).toBe('nom bo‘sh\nnarx musbat');
  });

  it('🔒 404 — "ruxsat yo‘q" demaydi', () => {
    const text = errorMessage(err(404));
    expect(text).toMatch(/Topilmadi/);
    expect(text).not.toMatch(/ruxsat/i);
  });

  it('5xx ichki tafsilotni ko‘rsatmaydi', () => {
    expect(errorMessage(err(500, ['PrismaClientKnownRequestError P2002']))).toBe(
      'Serverda xato. Qayta urinib ko‘ring.',
    );
  });

  it('tarmoq, 403, noma’lum xato', () => {
    expect(errorMessage(ApiError.network(new Error()))).toMatch(/aloqa yo‘q/);
    expect(errorMessage(err(403))).toMatch(/ruxsatingiz yo‘q/);
    expect(errorMessage(new TypeError('x'))).toMatch(/Kutilmagan/);
  });

  it('requestId', () => {
    expect(errorRequestId(err(500, [], 'req-9'))).toBe('req-9');
    expect(errorRequestId(new Error())).toBeUndefined();
  });
});
