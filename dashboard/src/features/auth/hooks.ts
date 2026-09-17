import { useMutation, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api } from '@/shared/api';
import { tokenStore } from '@/shared/auth';
import { can, type Permission } from '@/shared/lib/permissions';
import { queryKeys } from '@/shared/query';
import { session } from './session';

/** Sessiya bormi — token store o'zgarsa komponent qayta chiziladi. */
export function useHasSession(): boolean {
  return useSyncExternalStore(tokenStore.subscribe, tokenStore.hasSession, () => false);
}

/**
 * Joriy xodim — `GET /auth/me`. Rol va filial SHU javobdan olinadi, tokendan
 * emas: xodim boshqa filialga o'tkazilsa profil darhol joriy holatni beradi.
 */
export function useProfile() {
  const hasSession = useHasSession();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.get('/auth/me', { signal }),
    enabled: hasSession,
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

export function useLogout() {
  return useMutation({ mutationFn: session.logout });
}
