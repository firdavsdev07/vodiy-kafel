import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';

export function useSimilarProducts(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.similar(productId),
    queryFn: ({ signal }) => api.get('/admin/products/{id}/similar', { params: { id: productId }, signal }),
  });
}

/** Ro'yxat TO'LIQ almashtiriladi — bo'sh massiv hammasini olib tashlaydi. */
export function useSetSimilarProducts(productId: string) {
  return useMutation({
    mutationFn: (similarProductIds: string[]) =>
      api.post('/admin/products/{id}/similar', { params: { id: productId }, body: { similarProductIds } }),
    meta: { invalidates: [queryKeys.products.similar(productId)] },
  });
}

/** Qo'shish uchun qidiruv — 2+ harfdan, 10 ta natija. */
export function useProductSearch(search: string) {
  const query = { search, limit: 10, page: 1 };
  return useQuery({
    queryKey: queryKeys.products.list(query),
    queryFn: ({ signal }) => api.get('/admin/products', { query, signal }),
    enabled: search.trim().length >= 2,
    staleTime: 60_000,
  });
}
