import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type UploadOptions } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { UpdatePartnerBody } from './partner-form';

export type PartnerFilters = { isActive: string };

/** Hamkorlar (D-034) — massiv, tartib backendda (`sortOrder`). Ko'rish — barcha xodim. */
export function usePartners(filters: Partial<PartnerFilters>) {
  const query = filters.isActive === 'true' || filters.isActive === 'false' ? { isActive: filters.isActive === 'true' } : {};
  return useQuery({
    queryKey: queryKeys.partners.list(query),
    queryFn: ({ signal }) => api.get('/admin/partners', { query, signal }),
  });
}

// 🔒 Yozish — faqat SUPER_ADMIN (backend @Roles)

export function useCreatePartner() {
  return useMutation({
    mutationFn: ({ file, fields, ...options }: { file: File; fields: Record<string, string> } & UploadOptions) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) body.append(key, value);
      body.append('file', file);
      return api.upload('/admin/partners', { body, ...options });
    },
    meta: { invalidates: [queryKeys.partners.all] },
  });
}

export function useUpdatePartner() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePartnerBody }) => api.patch('/admin/partners/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.partners.all] },
  });
}

/**
 * Tartibni saqlash: bir nechta PATCH. Oxirida bitta invalidatsiya —
 * har PATCH dan keyin ro'yxat sakrab turmasin.
 */
export function useReorderPartners() {
  return useMutation({
    mutationFn: (patches: { id: string; sortOrder: number }[]) =>
      Promise.all(patches.map(({ id, sortOrder }) => api.patch('/admin/partners/{id}', { params: { id }, body: { sortOrder } }))),
    meta: { invalidates: [queryKeys.partners.all] },
  });
}

/** Yozuv va logotip BUTUNLAY o'chiriladi. Vaqtincha — `isActive: false`. */
export function useDeletePartner() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/partners/{id}', { params: { id } }),
    meta: { invalidates: [queryKeys.partners.all] },
  });
}

export function useUploadPartnerLogo() {
  return useMutation({
    mutationFn: ({ id, file, ...options }: { id: string; file: File } & UploadOptions) => {
      const body = new FormData();
      body.append('file', file);
      return api.upload('/admin/partners/{id}/logo', { params: { id }, body, ...options });
    },
    meta: { invalidates: [queryKeys.partners.all] },
  });
}
