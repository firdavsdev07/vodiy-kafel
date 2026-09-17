import { useMutation, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api } from '@/shared/api';
import { mustChangePassword, tokenStore, type ActorType } from '@/shared/auth';
import { can, type Permission } from '@/shared/lib/permissions';
import { queryKeys } from '@/shared/query';
import { session } from './session';

/** Sessiya bormi — token store o'zgarsa komponent qayta chiziladi. */
export function useHasSession(): boolean {
  return useSyncExternalStore(tokenStore.subscribe, tokenStore.hasSession, () => false);
}

/**
 * Sessiya kimniki — `'staff'` | `'customer'` | `null` (D-049).
 * Marshrutlarni ajratish uchun; haqiqiy tekshiruv backendda (G4).
 */
export function useActorType(): ActorType | null {
  return useSyncExternalStore(tokenStore.subscribe, tokenStore.getActorType, () => null);
}

/**
 * Vaqtinchalik parol hali almashtirilmaganmi (D-050).
 *
 * Bayroq refresh TOKEN ichidan o'qiladi — u sahifa yangilanganda ham
 * saqlanadigan yagona manba. `GET /auth/me` mijozga 401 beradi, ya'ni
 * bayroqni boshqa yo'l bilan bilib bo'lmaydi (api B-065 gacha).
 */
export function useMustChangePassword(): boolean {
  const refreshToken = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getRefreshToken,
    () => null,
  );
  return mustChangePassword(refreshToken);
}

/**
 * Joriy xodim — `GET /auth/me`. Rol va filial SHU javobdan olinadi, tokendan
 * emas: xodim boshqa filialga o'tkazilsa profil darhol joriy holatni beradi.
 *
 * ⚠ MIJOZ tokeni bilan bu endpoint 401 qaytaradi (backend: "Faqat XODIM
 *   tokeni uchun"). Shuning uchun `enabled` da aktor turi ham tekshiriladi —
 *   aks holda mijoz kirishi bilan 401 kelib, refresh urinilib, sessiya
 *   bekorga tozalanardi.
 */
export function useProfile() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.get('/auth/me', { signal }),
    enabled: hasSession && actorType === 'staff',
    staleTime: 5 * 60_000,
  });
}

/**
 * Joriy optom mijoz — `GET /me/profile` (D-051, api B-065).
 *
 * Kabinet sarlavhasi shundan: kompaniya nomi, filial, login.
 *
 * ⚠ `PasswordChangeRequiredGuard` bu endpointda ATAYLAB yo'q (backend
 *   izohi) — vaqtinchalik parol bilan kirgan mijoz ham o'zining kim
 *   ekanini ko'radi. Shuning uchun `enabled` da `mustChangePassword`
 *   tekshirilmaydi: parol ekranida ham profil kerak.
 */
export function useCustomerProfile() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  return useQuery({
    queryKey: queryKeys.cabinet.profile,
    queryFn: ({ signal }) => api.get('/me/profile', { signal }),
    enabled: hasSession && actorType === 'customer',
    staleTime: 5 * 60_000,
  });
}

/**
 * Joriy xodimda ruxsat bormi (D-007) — tugma/ustunni ko'rsatish uchun.
 * Profil hali kelmagan bo'lsa `false`: yozish tugmasi keyin paydo bo'ladi,
 * lekin bir lahza ham ruxsatsiz ko'rinmaydi. ⚠ G4: faqat UX.
 */
export function useCan(permission: Permission): boolean {
  return can(useProfile().data?.role, permission);
}

export function useLogin() {
  return useMutation({ mutationFn: session.login });
}

/** Optom mijoz kirishi (D-049) — telefon emas, `login` satri. */
export function useLoginWholesale() {
  return useMutation({ mutationFn: session.loginWholesale });
}

/**
 * Vaqtinchalik parolni almashtirish (D-050).
 * ⚠ Javobdagi yangi tokenlar `session` ichida saqlanadi — eski tokenda
 *   `mustChangePassword: true` qolgan va u bilan mijoz hamon to'silgan.
 */
export function useChangeWholesalePassword() {
  return useMutation({ mutationFn: session.changeWholesalePassword });
}

export function useLogout() {
  return useMutation({ mutationFn: session.logout });
}
