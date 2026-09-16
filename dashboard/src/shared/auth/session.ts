import type { ApiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/api-error';
import type { TokenStore } from './token-store';

/**
 * Sessiya amallari (D-006): kirish, jim yangilash, chiqish.
 * Factory — testda soxta api/store bilan tekshiriladi.
 */
export function createSession(deps: { api: ApiClient; store: TokenStore }) {
  const { api, store } = deps;
  let inflight: Promise<boolean> | null = null;

  /**
   * Parallel 401 lar BITTA `POST /auth/refresh` ga birlashadi: 5 ta so'rov
   * bir vaqtda eskirgan tokenga tushsa ham refresh bir marta ketadi.
   */
  function refresh(): Promise<boolean> {
    inflight ??= (async () => {
      const refreshToken = store.getRefreshToken();
      if (!refreshToken) return false;
      try {
        store.setTokens(await api.post('/auth/refresh', { body: { refreshToken } }));
        return true;
      } catch (error) {
        // Tarmoq/5xx — sessiya saqlanadi (internet qaytsa davom etadi).
        // 401/403 — refresh yaroqsiz yoki hisob o'chirilgan → sessiya tugadi.
        if (error instanceof ApiError && !error.isNetworkError && error.statusCode < 500) {
          store.clear();
        }
        return false;
      }
    })().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function login(credentials: { phone: string; password: string }): Promise<void> {
    store.setTokens(await api.post('/auth/admin/login', { body: credentials }));
  }

  /**
   * Backend tokenni BEKOR QILMAYDI (stateless) — asosiy ish local holatni
   * tozalash. Server chaqiruvi xato bersa ham chiqish to'xtamaydi.
   */
  async function logout(): Promise<void> {
    try {
      if (store.getAccessToken()) await api.post('/auth/logout');
    } catch {
      // e'tiborsiz — baribir chiqamiz
    } finally {
      store.clear();
    }
  }

  return { refresh, login, logout };
}

export type Session = ReturnType<typeof createSession>;
