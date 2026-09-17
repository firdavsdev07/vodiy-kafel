/**
 * Token saqlash (D-006). Boshlang'ich qaror (D-048 da qayta ko'riladi):
 *   access  — faqat xotirada (XSS o'qisa ham 15 daqiqa yashaydi)
 *   refresh — localStorage (sahifa yangilanganda sessiya qolsin; backend
 *             httpOnly cookie o'rnatmaydi, token faqat javob tanasida)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sessiya kimniki (D-049). Ikkalasi `/auth/refresh` ni BIR XIL ishlatadi,
 * shuning uchun tokenning o'zidan kim ekanini bilib bo'lmaydi — buni
 * alohida eslab qolamiz.
 *
 * ⚠ Nega kerak: sahifa yangilanganda faqat `refreshToken` qoladi. Usiz
 *   ilova "kimni kutyapman — xodimnimi yoki mijoznimi" bilmaydi va mijozni
 *   xodim marshrutiga (yoki teskarisiga) yuborib qo'yadi.
 * ⚠ Bu — QULAYLIK, himoya EMAS: haqiqiy tekshiruv backendda, token ichida
 *   (`CustomerOnlyGuard` / `RolesGuard`). Bu yerdagi qiymat buzib
 *   yozilsa ham, backend baribir 401/403 qaytaradi.
 */
export type ActorType = 'staff' | 'customer';

export const REFRESH_TOKEN_KEY = 'vk-dashboard-refresh-token';
export const ACTOR_TYPE_KEY = 'vk-dashboard-actor';

function readActor(storage: KeyValueStorage | null): ActorType | null {
  const raw = safe(() => storage?.getItem(ACTOR_TYPE_KEY) ?? null, null);
  return raw === 'staff' || raw === 'customer' ? raw : null;
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createTokenStore(storage: KeyValueStorage | null) {
  let accessToken: string | null = null;
  let refreshToken: string | null = safe(() => storage?.getItem(REFRESH_TOKEN_KEY) ?? null, null);
  let actorType: ActorType | null = refreshToken === null ? null : readActor(storage);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    /** Sessiya bormi (access yo'q bo'lsa ham refresh bilan tiklanadi). */
    hasSession: () => refreshToken !== null,
    /**
     * Sessiya kimniki — sessiya yo'q bo'lsa `null`.
     *
     * ⚠ ORQAGA MOSLIK: sessiya BOR, lekin aktor yozilmagan bo'lsa —
     *   `'staff'`. Bunday holat ikki joyda uchraydi:
     *     1. D-049 dan OLDIN kirgan xodim: `localStorage` da refresh
     *        token bor, aktor kaliti yo'q. O'sha paytda kabinet umuman
     *        yo'q edi, demak sessiya faqat xodimniki bo'lishi mumkin.
     *     2. Testlar — `setTokens()` ni aktorsiz chaqiradi.
     *
     *   Buni `null` qoldirish jiddiy xato bo'lardi: `useProfile` aktor
     *   turiga bog'liq, ya'ni allaqachon kirgan HAR BIR xodimda profil
     *   yuklanmay qolardi — menyu bo'sh, ruxsat yo'q, panel ishlamaydi.
     */
    getActorType: (): ActorType | null =>
      refreshToken === null ? null : (actorType ?? 'staff'),

    /**
     * `actor` faqat KIRISHDA beriladi. `/auth/refresh` da berilmaydi —
     * u aktorni o'zgartirmaydi, shuning uchun eski qiymat saqlanadi.
     */
    setTokens(pair: TokenPair, actor?: ActorType) {
      accessToken = pair.accessToken;
      refreshToken = pair.refreshToken;
      if (actor !== undefined) {
        actorType = actor;
        safe(() => storage?.setItem(ACTOR_TYPE_KEY, actor), undefined);
      }
      safe(() => storage?.setItem(REFRESH_TOKEN_KEY, pair.refreshToken), undefined);
      emit();
    },

    clear() {
      if (accessToken === null && refreshToken === null) return;
      accessToken = null;
      refreshToken = null;
      actorType = null;
      safe(() => storage?.removeItem(REFRESH_TOKEN_KEY), undefined);
      safe(() => storage?.removeItem(ACTOR_TYPE_KEY), undefined);
      emit();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type TokenStore = ReturnType<typeof createTokenStore>;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // localStorage bloklangan (private rejim) — xotirada ishlaydi
  }
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const tokenStore = createTokenStore(browserStorage());
