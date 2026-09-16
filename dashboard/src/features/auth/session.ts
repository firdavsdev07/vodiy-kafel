import { api, setAuthHooks } from '@/shared/api';
import { createSession, tokenStore } from '@/shared/auth';
import { queryClient, setUnauthorizedHandler } from '@/shared/query';

export const session = createSession({ api, store: tokenStore });

/**
 * Auth'ni API klient va TanStack Query'ga ulaydi (D-006). `main.tsx` da
 * render'dan OLDIN bir marta chaqiriladi.
 */
export function wireAuth(): void {
  setAuthHooks({
    getAccessToken: tokenStore.getAccessToken,
    refreshAccessToken: session.refresh,
  });

  // Refresh ham o'tmadi (klient ichida urinib bo'lingan) — sessiya tugagan bo'lsa tozalaymiz.
  // Tarmoq xatosida sessiya qoladi: store.clear() faqat 4xx refreshda chaqirilgan.
  setUnauthorizedHandler(() => {
    if (!tokenStore.hasSession()) queryClient.clear();
  });

  // Sessiya qayerda tugamasin (chiqish, refresh rad etildi) — boshqa xodimning
  // keshlangan ma'lumoti keyingi kirishga o'tib ketmasin.
  tokenStore.subscribe(() => {
    if (!tokenStore.hasSession()) queryClient.clear();
  });
}
