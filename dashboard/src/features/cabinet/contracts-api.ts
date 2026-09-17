import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Page, type Schema } from '@/shared/api';
import { saveDownloadedFile } from '@/shared/lib/download-file';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type Contract = Schema<'ContractResponseDto'>;
export type CreateContractBody = Schema<'CreateContractDto'>;

/** Shartnomalar ro'yxati — `GET /wholesale/contracts` (D-059). */
export function useMyContracts(params: ListParams<Record<string, string>>) {
  const query = { page: params.page, limit: params.limit };
  return useQuery({
    queryKey: queryKeys.cabinet.contracts.list(query),
    queryFn: ({ signal }) =>
      api.get('/wholesale/contracts', { query, signal }) as Promise<Page<Contract>>,
  });
}

/**
 * Yangi shartnoma — INN bo'yicha (D-059).
 *
 * ⚠ Didox.uz / E-IMZO nomlari hali KODDA YOZILMAYDI — backend hozircha
 *   mock (api B-045), haqiqiy integratsiya o'z taskida (B-044).
 */
export function useCreateContract() {
  return useMutation({
    mutationFn: (body: CreateContractBody) => api.post('/wholesale/contracts', { body }),
    meta: { invalidates: [queryKeys.cabinet.contracts.all] },
  });
}

/**
 * Shartnoma PDF ini yuklab olish (D-059).
 *
 * 🔒 Oddiy `<a href>` ISHLAMAYDI: backend PDF ni faqat autentifikatsiya
 *    bilan beradi ("PDF havolasi alohida berilmaydi"). Shuning uchun
 *    `api.download()` — token bilan `fetch`, keyin blob.
 */
export function useDownloadContract() {
  return useMutation({
    mutationFn: async (contract: Pick<Contract, 'id' | 'inn'>) => {
      const file = await api.download('/wholesale/contracts/{id}/download', {
        params: { id: contract.id },
      });
      saveDownloadedFile(file, `shartnoma-${contract.inn}.pdf`);
    },
  });
}
