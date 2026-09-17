import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type UploadOptions } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { MediaType, ProductMedia } from './media';

const mediaKey = (productId: string) => queryKeys.media.list({ productId });

/** Mahsulot media (D-013) — tartiblangan (sortOrder). */
export function useProductMedia(productId: string) {
  return useQuery({
    queryKey: mediaKey(productId),
    queryFn: ({ signal }) => api.get('/admin/products/{id}/media', { params: { id: productId }, signal }),
  });
}

export function useUploadMedia(productId: string) {
  return useMutation({
    mutationFn: ({ file, type, ...options }: { file: File; type: MediaType } & UploadOptions) => {
      const body = new FormData();
      body.append('type', type);
      body.append('file', file);
      return api.upload('/admin/products/{id}/media', { params: { id: productId }, body, ...options });
    },
    // Birinchi rasm ro'yxatda muqova bo'ladi (B-060 dan keyin) — mahsulotlar ham yangilansin
    meta: { invalidates: [mediaKey(productId), queryKeys.products.all] },
  });
}

/**
 * Tartib: darhol ekranda (optimistik), xato bo'lsa eski tartib qaytadi.
 * Backend BARCHA ID larni talab qiladi — qisman ro'yxat 400.
 */
export function useReorderMedia(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ProductMedia[]) =>
      api.patch('/admin/products/{id}/media/order', {
        params: { id: productId },
        body: { mediaIds: items.map((m) => m.id) },
      }),
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: mediaKey(productId) });
      const previous = queryClient.getQueryData<ProductMedia[]>(mediaKey(productId));
      queryClient.setQueryData(mediaKey(productId), items);
      return { previous };
    },
    onError: (_error, _items, context) => {
      if (context?.previous) queryClient.setQueryData(mediaKey(productId), context.previous);
    },
    meta: { invalidates: [mediaKey(productId), queryKeys.products.all] },
  });
}

/** Bazadagi yozuv ham, diskdagi fayl ham o'chiriladi. */
export function useDeleteMedia(productId: string) {
  return useMutation({
    mutationFn: (mediaId: string) => api.delete('/admin/media/{id}', { params: { id: mediaId } }),
    meta: { invalidates: [mediaKey(productId), queryKeys.products.all] },
  });
}
