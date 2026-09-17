import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { CreateFactoryBody, UpdateFactoryBody } from './factory-form';

/**
 * Zavodlar (D-009). ⚠ `GET /admin/factories` SAHIFALANMAYDI — backend
 * hammasini `sortOrder, name` tartibida beradi (zavodlar o'nlab, minglab
 * emas). Shuning uchun bu yerda page/limit yo'q.
 */
export function useFactories() {
  return useQuery({
    queryKey: queryKeys.factories.lists(),
    queryFn: ({ signal }) => api.get('/admin/factories', { signal }),
  });
}

const invalidates = [queryKeys.factories.all, queryKeys.products.all];

export function useCreateFactory() {
  return useMutation({
    mutationFn: (body: CreateFactoryBody) => api.post('/admin/factories', { body }),
    meta: { invalidates },
  });
}

export function useUpdateFactory() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFactoryBody }) =>
      api.patch('/admin/factories/{id}', { params: { id }, body: body as never }),
    meta: { invalidates },
  });
}

/** Soft delete: `isActive: false`. Zavod mahsulotlari ochiq katalogdan yashiriladi. */
export function useDeleteFactory() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/factories/{id}', { params: { id } }),
    meta: { invalidates },
  });
}
