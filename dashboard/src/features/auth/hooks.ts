import { useMutation, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api } from '@/shared/api';
import { tokenStore, type StaffProfile } from '@/shared/auth';
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
    queryFn: async ({ signal }) =>
      // ⚠ B-059 gacha: generatsiya qilingan tur nullable maydonlarda noto'g'ri
      (await api.get('/auth/me', { signal })) as unknown as StaffProfile,
    enabled: hasSession,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  return useMutation({ mutationFn: session.login });
}

export function useLogout() {
  return useMutation({ mutationFn: session.logout });
}
