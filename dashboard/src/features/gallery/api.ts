import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api, type UploadOptions } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import type { UpdateGalleryBody } from './gallery-form';

export type GalleryFilters = { isActive: string };

/** Galereya (D-015) — sahifalangan; tartib backendda (sortOrder). */
export function useGallery(params: ListParams<GalleryFilters>) {
  const { isActive } = params.filters;
  const query = {
    page: params.page,
    limit: params.limit,
    ...(isActive === 'true' || isActive === 'false' ? { isActive: isActive === 'true' } : {}),
  };
  return useQuery({
    queryKey: queryKeys.gallery.list(query),
    queryFn: ({ signal }) => api.get('/admin/gallery', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateGalleryItem() {
  return useMutation({
    mutationFn: ({ file, fields, ...options }: { file: File; fields: Record<string, string> } & UploadOptions) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) body.append(key, value);
      body.append('file', file);
      return api.upload('/admin/gallery', { body, ...options });
    },
    meta: { invalidates: [queryKeys.gallery.all] },
  });
}

export function useUpdateGalleryItem() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGalleryBody }) =>
      api.patch('/admin/gallery/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.gallery.all] },
  });
}

/** Yozuv ham, fayl ham butunlay o'chiriladi. Vaqtincha — isActive:false. */
export function useDeleteGalleryItem() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/gallery/{id}', { params: { id } }),
    meta: { invalidates: [queryKeys.gallery.all] },
  });
}
