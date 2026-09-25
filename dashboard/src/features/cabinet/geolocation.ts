/**
 * Brauzer geolokatsiyasi — "Joylashuvim" tugmasi uchun (T-003).
 *
 * ⚠ Nega alohida: avval `getCurrentPosition(ok, fail)` PARAMETRSIZ
 *   chaqirilardi — standart `timeout` cheksiz. Ko'p kompyuterda (GPS yo'q,
 *   tarmoq joylashuvi o'chiq) javob umuman kelmasdi: tugma hech narsa
 *   ko'rsatmas, foydalanuvchi faqat "Xaritani bosib belgilang" yozuvini
 *   ko'rib qolardi. Xato bo'lsa ham sababi aytilmasdi.
 */

export type LocateFailure =
  /** HTTP (localhost emas) — brauzer geolokatsiyani umuman bermaydi. */
  | 'insecure'
  /** Brauzerda API yo'q. */
  | 'unsupported'
  /** Foydalanuvchi yoki brauzer sozlamasi ruxsat bermagan. */
  | 'denied'
  /** Qurilma joylashuvni aniqlay olmadi (GPS/Wi-Fi yo'q, OS da o'chiq). */
  | 'unavailable'
  /** Belgilangan vaqtda javob kelmadi. */
  | 'timeout';

export interface LocatedPoint {
  lat: number;
  lng: number;
  /** Metrda, 68% ishonch radiusi. */
  accuracy: number;
}

export type LocateResult = { ok: true; point: LocatedPoint } | { ok: false; reason: LocateFailure };

/** Foydalanuvchiga ko'rinadigan matn — nima bo'ldi va NIMA QILISH kerak. */
export const locateFailureText: Record<LocateFailure, string> = {
  insecure: 'Joylashuv faqat xavfsiz (https) sahifada ishlaydi. Xaritani bosib nuqtani belgilang.',
  unsupported: 'Bu brauzer joylashuvni aniqlay olmaydi. Xaritani bosib yoki manzilni qidirib belgilang.',
  denied:
    'Joylashuvga ruxsat berilmagan. Manzil satridagi qulf belgisini bosib, «Joylashuv» ga ruxsat bering va qayta urining.',
  unavailable:
    'Qurilma joylashuvni aniqlay olmadi. Telefon/kompyuterda joylashuv xizmati yoqilganini tekshiring yoki xaritani bosib belgilang.',
  timeout: 'Joylashuv aniqlanmadi — javob kelmadi. Qayta urining yoki xaritani bosib belgilang.',
};

/** Aniqlik shundan yomon bo'lsa — foydalanuvchiga nuqtani tuzatishni aytamiz. */
export const COARSE_ACCURACY_M = 500;

const HIGH_ACCURACY: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 };
const LOW_ACCURACY: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 };

type GeoEnv = {
  isSecureContext: boolean;
  geolocation: Geolocation | undefined;
};

function once(geo: Geolocation, options: PositionOptions): Promise<LocateResult> {
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
        }),
      (error) =>
        resolve({
          ok: false,
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable',
        }),
      options,
    );
  });
}

/**
 * Joylashuvni aniqlaydi. Avval aniq (GPS), bo'lmasa — oddiy aniqlikda
 * (Wi-Fi / tarmoq) qayta urinadi: kompyuterda GPS yo'q, lekin tarmoq
 * joylashuvi ko'pincha bor. Ruxsat berilmagan bo'lsa qayta so'ralmaydi.
 */
export async function locate(
  env: GeoEnv = {
    isSecureContext: window.isSecureContext,
    geolocation: typeof navigator === 'undefined' ? undefined : navigator.geolocation,
  },
): Promise<LocateResult> {
  if (!env.isSecureContext) return { ok: false, reason: 'insecure' };
  if (!env.geolocation) return { ok: false, reason: 'unsupported' };

  const precise = await once(env.geolocation, HIGH_ACCURACY);
  if (precise.ok || precise.reason === 'denied') return precise;
  return once(env.geolocation, LOW_ACCURACY);
}
