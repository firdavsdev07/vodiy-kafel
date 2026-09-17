import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv (D-001)', () => {
  it('oxiridagi / olib tashlanadi', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000/api/v1/' })).toEqual(
      { apiUrl: 'http://localhost:3000/api/v1', dev: false },
    );
  });

  it('DEV bayrog‘i o‘qiladi (mock to‘lov tugmasi shunga bog‘liq — D-055)', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000/api/v1', DEV: true }).dev).toBe(true);
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000/api/v1' }).dev).toBe(false);
  });

  it.each([
    ['yo‘q', undefined],
    ['bo‘sh', '  '],
    ['manzil emas', 'localhost:3000'],
    ['http(s) emas', 'ftp://example.com/api'],
  ])('%s — aniq xato', (_label, value) => {
    expect(() => parseEnv({ VITE_API_URL: value })).toThrow(/VITE_API_URL/);
  });
});
