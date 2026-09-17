import { describe, expect, it } from 'vitest';
import { classifyRouteError } from './route-error';

describe('sahifa xatosi turi (D-042)', () => {
  it('yangi deploydan keyin eski chunk topilmadi → "yangilang"', () => {
    expect(classifyRouteError(new TypeError('Failed to fetch dynamically imported module: /assets/Orders-abc.js'))).toBe('chunk');
    expect(classifyRouteError(new Error('Importing a module script failed.'))).toBe('chunk');
  });

  it('404 marshrut → topilmadi (ruxsat yo‘q EMAS)', () => {
    expect(classifyRouteError({ status: 404, statusText: 'Not Found', internal: true, data: '' })).toBe('not-found');
  });

  it('boshqa xato → umumiy (tafsilot ko‘rsatilmaydi)', () => {
    expect(classifyRouteError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe('unknown');
    expect(classifyRouteError('oddiy matn')).toBe('unknown');
  });
});
