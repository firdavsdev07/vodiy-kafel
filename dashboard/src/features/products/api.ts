import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import { toProductsQuery, type ProductFilters } from './list';
import type { CreateProductBody, UpdateProductBody } from './product-form';

/**
 * Mahsulotlar ro'yxati (D-011) — server sahifalash/saralash/filtr.
 * `keepPreviousData`: sahifa yoki filtr almashganda jadval bo'shab qolmaydi,
 * eski qatorlar xira turadi (eng ko'p ishlatiladigan sahifa — sakrash yo'q).
 */
export function useProducts(params: ListParams<ProductFilters>) {
  const query = toProductsQuery(params);
  return useQuery({
    queryKey: queryKeys.products.list(query),
    queryFn: ({ signal }) => api.get('/admin/products', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => api.get('/admin/products/{id}', { params: { id }, signal }),
    enabled: id !== '',
  });
}

// Mahsulot o'zgarsa: ro'yxatlar, kartasi, zavod/o'lcham hisoblagichlari (productCount)
const invalidates = [queryKeys.products.all, queryKeys.factories.all, queryKeys.sizes.all];

export function useCreateProduct() {
  return useMutation({
    mutationFn: (body: CreateProductBody) => api.post('/admin/products', { body }),
    meta: { invalidates },
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductBody }) =>
      api.patch('/admin/products/{id}', { params: { id }, body }),
    meta: { invalidates },
  });
}

/** Soft delete — `isActive: false`, ochiq katalogdan yo'qoladi; tiklash PATCH isActive. */
export function useDeleteProduct() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/products/{id}', { params: { id } }),
    meta: { invalidates },
  });
}
