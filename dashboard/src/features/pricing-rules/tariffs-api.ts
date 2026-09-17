import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';

/** Bitta filialda yo'nalish (viloyat × transport) ko'p emas — bir sahifada sig'adi. */
const LIMIT = 200;

/**
 * Mijoz filialining tariflari — `scope=ROUTE` qoidasi uchun (D-019).
 *
 * ⚠ `scopeId` AYNAN mijoz filialining tarifi bo'lishi kerak (backend shuni
 *    talab qiladi), shuning uchun `branchId` bo'yicha filtrlaymiz.
 *    Filial admini uchun backend baribir o'z filialiga majburlaydi (G5).
 */
export function useBranchTariffs(branchId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tariffs.list({ branchId, isActive: true }),
    queryFn: ({ signal }) =>
      api.get('/admin/tariffs', {
        query: { branchId, isActive: true, limit: LIMIT },
        signal,
      }),
    enabled: enabled && Boolean(branchId),
    staleTime: 5 * 60_000,
  });
}
