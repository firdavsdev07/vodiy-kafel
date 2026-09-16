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

export const REFRESH_TOKEN_KEY = 'vk-dashboard-refresh-token';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createTokenStore(storage: KeyValueStorage | null) {
  let accessToken: string | null = null;
  let refreshToken: string | null = safe(() => storage?.getItem(REFRESH_TOKEN_KEY) ?? null, null);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    /** Sessiya bormi (access yo'q bo'lsa ham refresh bilan tiklanadi). */
    hasSession: () => refreshToken !== null,

    setTokens(pair: TokenPair) {
      accessToken = pair.accessToken;
      refreshToken = pair.refreshToken;
      safe(() => storage?.setItem(REFRESH_TOKEN_KEY, pair.refreshToken), undefined);
      emit();
    },

    clear() {
      if (accessToken === null && refreshToken === null) return;
      accessToken = null;
      refreshToken = null;
      safe(() => storage?.removeItem(REFRESH_TOKEN_KEY), undefined);
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
