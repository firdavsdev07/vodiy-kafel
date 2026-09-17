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
    store.setTokens(await api.post('/auth/admin/login', { body: credentials }), 'staff');
  }

  /**
   * Optom (B2B) mijoz kirishi (D-049) — `POST /auth/wholesale/login`.
   *
   * ⚠ XODIMDAN FARQI: telefon EMAS, `login` satri (masalan `fargona-optom`).
   *   Mijoz o'zi ro'yxatdan o'tmaydi — login va parolni admin beradi.
   *
   * Javobdagi `mustChangePassword` QAYTARILADI, chunki `GET /auth/me`
   * mijoz tokeni bilan 401 beradi (backend: "Faqat XODIM tokeni uchun").
   * Ya'ni bu bayroqni boshqa hech qayerdan bilib bo'lmaydi — api B-065
   * kelguncha uni chaqiruvchi eslab qolishi kerak.
   */
  async function loginWholesale(credentials: {
    login: string;
    password: string;
  }): Promise<{ mustChangePassword: boolean }> {
    const tokens = await api.post('/auth/wholesale/login', { body: credentials });
    store.setTokens(tokens, 'customer');
    return { mustChangePassword: tokens.mustChangePassword };
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

  return { refresh, login, loginWholesale, changeWholesalePassword, logout };
}

export type Session = ReturnType<typeof createSession>;
