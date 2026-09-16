import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import type { UpsertStockBody } from './stock';

export type StockFilters = { productId: string };

/** Markaziy ombor zaxirasi (D-018) — har mahsulot bitta qator, FILIALGA BOG'LIQ EMAS. */
export function useStocks(params: ListParams<StockFilters>) {
  const { productId } = params.filters;
  const query = { page: params.page, limit: params.limit, ...(productId ? { productId } : {}) };
  return useQuery({
    queryKey: queryKeys.productStocks.list(query),
    queryFn: ({ signal }) => api.get('/admin/product-stocks', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUpsertStock() {
  return useMutation({
    mutationFn: (body: UpsertStockBody) => api.put('/admin/product-stocks', { body }),
    // Zaxira holati mahsulot ro'yxati va kartasida ham ko'rinadi
    meta: { invalidates: [queryKeys.productStocks.all, queryKeys.products.all] },
  });
}
