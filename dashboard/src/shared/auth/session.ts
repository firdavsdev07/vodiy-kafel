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

  /**
   * YAGONA kirish (2026-09-18, mijoz talabi) — `POST /auth/login`.
   * Telefon + parol: xodim ham, optom (B2B) mijoz ham AYNAN shu bilan,
   * bitta formadan kiradi. Kim ekanini javobdagi `actorType` aytadi.
   *
   * ⚠ TARIX: avval xodim `/auth/admin/login` (telefon), mijoz
   *   `/auth/wholesale/login` (login satri) — ikki xil sahifadan kirardi.
   *   Mijoz buni chalkash topdi: "nega bitta login sahifadan emas?".
   *   Endi ikkalasi ham shu funksiyadan o'tadi.
   */
  async function login(
    credentials: { phone: string; password: string },
  ): Promise<{ actorType: 'USER' | 'CUSTOMER'; mustChangePassword: boolean }> {
    const tokens = await api.post('/auth/login', { body: credentials });
    store.setTokens(tokens, tokens.actorType === 'CUSTOMER' ? 'customer' : 'staff');
    return { actorType: tokens.actorType, mustChangePassword: tokens.mustChangePassword };
  }

  /**
   * Vaqtinchalik parolni almashtirish (D-050).
   * ⚠ Javobdagi YANGI tokenlar ALMASHTIRILADI: eskisida
   *   `mustChangePassword: true` qolgan va u bilan mijoz hamon to'silgan
   *   bo'lardi (backend shuni aniq ogohlantiradi).
   */
  async function changeWholesalePassword(body: {
    oldPassword: string;
    newPassword: string;
  }): Promise<void> {
    store.setTokens(
      await api.post('/auth/wholesale/change-password', { body }),
      'customer',
    );
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

  return { refresh, login, changeWholesalePassword, logout };
}

export type Session = ReturnType<typeof createSession>;
