import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Schema } from '@/shared/api';
import { queryKeys } from '@/shared/query';

export type BackupStatus = Schema<'BackupStatusDto'>;

/**
 * Zaxira nusxa holati (T-018). 🔒 Faqat SUPER_ADMIN. Nusxa jadval bo'yicha
 * fonda olinadi — sahifa ochiq tursa har daqiqada yangilanadi.
 */
export function useBackupStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.backup.detail('status'),
    queryFn: ({ signal }) => api.get('/admin/backup', { signal }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled,
  });
}

/** «Hozir yuborish»: javob — urinishdan keyingi holat, kesh shu bilan yangilanadi. */
export function useRunBackup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/admin/backup/run'),
    onSuccess: (status) => client.setQueryData(queryKeys.backup.detail('status'), status),
  });
}
