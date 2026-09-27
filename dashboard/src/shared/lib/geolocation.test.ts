import { describe, expect, it, vi } from 'vitest';
import { locate, locateFailureText } from './geolocation';

const CODES = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as const;

type Outcome = { lat: number; lng: number; accuracy: number } | keyof typeof CODES;

/** Har chaqiruvga navbatdagi natijani beradigan soxta `Geolocation`. */
function fakeGeo(...outcomes: Outcome[]) {
  const getCurrentPosition = vi.fn(
    (ok: PositionCallback, fail: PositionErrorCallback | null | undefined, _options?: PositionOptions) => {
      const next = outcomes.shift();
      if (next === undefined) throw new Error('kutilmagan chaqiruv');
      if (typeof next === 'string') {
        fail?.({ code: CODES[next], message: next, ...CODES } as GeolocationPositionError);
      } else {
        ok({
          coords: { latitude: next.lat, longitude: next.lng, accuracy: next.accuracy },
        } as GeolocationPosition);
      }
    },
  );
  return { geo: { getCurrentPosition } as unknown as Geolocation, getCurrentPosition };
}

describe('locate (T-003)', () => {
  it('🐞 vaqt chegarasi HAR DOIM beriladi — avval cheksiz kutardi', async () => {
    const { geo, getCurrentPosition } = fakeGeo({ lat: 40.38, lng: 71.78, accuracy: 12 });
    await locate({ isSecureContext: true, geolocation: geo });
    const options = getCurrentPosition.mock.calls[0]?.[2];
    expect(options?.timeout).toBeGreaterThan(0);
    expect(Number.isFinite(options?.timeout)).toBe(true);
  });

  it('aniq joylashuv topilsa — o‘sha, aniqligi bilan', async () => {
    const { geo } = fakeGeo({ lat: 40.38, lng: 71.78, accuracy: 12 });
    await expect(locate({ isSecureContext: true, geolocation: geo })).resolves.toEqual({
      ok: true,
      point: { lat: 40.38, lng: 71.78, accuracy: 12 },
    });
  });

  it.each(['TIMEOUT', 'POSITION_UNAVAILABLE'] as const)(
    'GPS %s bo‘lsa — oddiy aniqlikda (tarmoq) qayta urinadi',
    async (first) => {
      const { geo, getCurrentPosition } = fakeGeo(first, { lat: 40.4, lng: 71.8, accuracy: 900 });
      const result = await locate({ isSecureContext: true, geolocation: geo });
      expect(result).toEqual({ ok: true, point: { lat: 40.4, lng: 71.8, accuracy: 900 } });
      expect(getCurrentPosition.mock.calls[0]?.[2]?.enableHighAccuracy).toBe(true);
      expect(getCurrentPosition.mock.calls[1]?.[2]?.enableHighAccuracy).toBe(false);
    },
  );

  it('ruxsat berilmasa — qayta SO‘RALMAYDI, sababi "denied"', async () => {
    const { geo, getCurrentPosition } = fakeGeo('PERMISSION_DENIED');
    await expect(locate({ isSecureContext: true, geolocation: geo })).resolves.toEqual({
      ok: false,
      reason: 'denied',
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('ikkala urinish ham tugamasa — "timeout"', async () => {
    const { geo } = fakeGeo('TIMEOUT', 'TIMEOUT');
    await expect(locate({ isSecureContext: true, geolocation: geo })).resolves.toEqual({
      ok: false,
      reason: 'timeout',
    });
  });

  it('https bo‘lmasa yoki API yo‘q bo‘lsa — brauzerga murojaat qilinmaydi', async () => {
    const { geo, getCurrentPosition } = fakeGeo();
    await expect(locate({ isSecureContext: false, geolocation: geo })).resolves.toEqual({
      ok: false,
      reason: 'insecure',
    });
    await expect(locate({ isSecureContext: true, geolocation: undefined })).resolves.toEqual({
      ok: false,
      reason: 'unsupported',
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('har bir xato uchun foydalanuvchiga nima qilishni aytadigan matn bor', () => {
    for (const text of Object.values(locateFailureText)) expect(text.length).toBeGreaterThan(20);
    expect(locateFailureText.denied).toMatch(/ruxsat/);
  });
});
