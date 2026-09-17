import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { CreateSizeBody, UpdateSizeBody } from './size-form';

/** O'lchamlar (D-010). `GET /admin/sizes` sahifalanmaydi — hammasi `sortOrder` tartibida. */
export function useSizes() {
  return useQuery({
    queryKey: queryKeys.sizes.lists(),
    queryFn: ({ signal }) => api.get('/admin/sizes', { signal }),
  });
}

// O'lcham yozuvi mahsulot ro'yxati va kartasida ko'rinadi
const invalidates = [queryKeys.sizes.all, queryKeys.products.all];

export function useCreateSize() {
  return useMutation({
    mutationFn: (body: CreateSizeBody) => api.post('/admin/sizes', { body }),
    meta: { invalidates },
  });
}

export function useUpdateSize() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSizeBody }) =>
      api.patch('/admin/sizes/{id}', { params: { id }, body: body as never }),
    meta: { invalidates },
  });
}

/** HAQIQIY o'chirish. Mahsuloti bor o'lcham — 409 (nechtasi to'sayotgani matnda). */
export function useDeleteSize() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/sizes/{id}', { params: { id } }),
    meta: { invalidates },
  });
}
