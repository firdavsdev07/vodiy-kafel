import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import type { UpsertStockBody } from './stock';

export type StockFilters = { productId: string; stockStatus: string };

const STOCK_STATUSES = ['IN_STOCK', 'LOW', 'OUT_OF_STOCK'] as const;
type StockStatusValue = (typeof STOCK_STATUSES)[number];
const isStockStatus = (value: string | undefined): value is StockStatusValue =>
  STOCK_STATUSES.includes(value as StockStatusValue);

/**
 * Markaziy ombor zaxirasi (D-018) — har mahsulot bitta qator, FILIALGA
 * BOG'LIQ EMAS.
 *
 * `stockStatus` filtri — api B-063 da qo'shildi. Undan oldin "kam qolgan
 * mahsulotlar" ni ko'rish uchun butun ro'yxatni yuklash kerak edi, bu esa
 * G10 ga zid.
 */
export function useStocks(params: ListParams<StockFilters>) {
  const { productId, stockStatus } = params.filters;
  const query = {
    page: params.page,
    limit: params.limit,
    ...(productId ? { productId } : {}),
    // Begona qiymat (URL qo'lda tahrirlangan) yuborilmaydi — 400 bo'lmasin
    ...(isStockStatus(stockStatus) ? { stockStatus } : {}),
  };
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
