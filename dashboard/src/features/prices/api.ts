import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import { toPricesQuery, type PriceFilters, type UpsertPriceBody } from './prices';

export function useBranchPrices(params: ListParams<PriceFilters>) {
  const query = toPricesQuery(params);
  return useQuery({
    queryKey: queryKeys.branchProducts.list(query),
    queryFn: ({ signal }) => api.get('/admin/branch-products', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

// Narx o'zgarsa — mijoz narx qoidalari hisob-kitobi ham (D-019) eskiradi
const invalidates = [queryKeys.branchProducts.all];

export function useUpdatePrice() {
  return useMutation({
    mutationFn: ({ id, pricePerSqm }: { id: string; pricePerSqm: string }) =>
      api.patch('/admin/branch-products/{id}/price', { params: { id }, body: { pricePerSqm } }),
    meta: { invalidates },
  });
}

/** Narx qo'shish / holat almashtirish — (filial, mahsulot) bo'yicha upsert. */
export function useUpsertPrice() {
  return useMutation({
    mutationFn: (body: UpsertPriceBody) => api.put('/admin/branch-products', { body }),
    meta: { invalidates },
  });
}

/**
 * Ommaviy yuborish (D-017) — har so'rovdan keyin ro'yxat QAYTA YUKLANMAYDI
 * (50 ta narx = 50 ta refetch bo'lardi); `finish()` oxirida bir marta.
 */
export function useBulkPriceUpdate() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, pricePerSqm }: { id: string; pricePerSqm: string }) =>
      api.patch('/admin/branch-products/{id}/price', { params: { id }, body: { pricePerSqm } }),
  });
  return {
    send: mutation.mutateAsync,
    finish: () => queryClient.invalidateQueries({ queryKey: queryKeys.branchProducts.all }),
  };
}
