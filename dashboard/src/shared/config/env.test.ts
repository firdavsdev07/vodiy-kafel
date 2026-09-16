import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv (D-001)', () => {
  it('oxiridagi / olib tashlanadi', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000/api/v1/' })).toEqual(
      { apiUrl: 'http://localhost:3000/api/v1' },
    );
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
