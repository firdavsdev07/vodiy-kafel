import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';

/**
 * Filiallar ro'yxati — SUPER_ADMIN filial tanlagichlari uchun (D-016,
 * D-020 …). 🔒 G5: filial xodimida `enabled: false` — umuman so'ralmaydi.
 */
export function useBranches(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.branches.lists(),
    queryFn: ({ signal }) => api.get('/admin/branches', { signal }),
    enabled,
    staleTime: 10 * 60_000,
  });
}
