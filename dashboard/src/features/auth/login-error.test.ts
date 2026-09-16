import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { loginErrorMessage } from './login-error';

const err = (statusCode: number, requestId?: string) =>
  new ApiError({ statusCode, messages: ['server matni'], error: 'x', requestId });

describe('loginErrorMessage', () => {
  it('401 — parol yoki telefon noto‘g‘ri (qaysi biri — aytilmaydi)', () => {
    expect(loginErrorMessage(err(401))).toMatch(/Telefon raqami yoki parol/);
  });
  it('429 — throttling', () => {
    expect(loginErrorMessage(err(429))).toMatch(/Juda ko‘p urinish/);
  });
  it('5xx — requestId ko‘rsatiladi', () => {
    expect(loginErrorMessage(err(500, 'req-9'))).toContain('req-9');
  });
  it('tarmoq', () => {
    expect(loginErrorMessage(ApiError.network(new TypeError()))).toMatch(/aloqa yo‘q/);
  });
});
