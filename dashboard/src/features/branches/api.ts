import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type UploadOptions } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { BranchType, CreateBranchBody, UpdateBranchBody } from './branch-form';

/**
 * Filiallar ro'yxati — SUPER_ADMIN filial tanlagichlari uchun (D-016,
 * D-020 …). 🔒 G5: filial xodimida `enabled: false` — umuman so'ralmaydi.
 */
export function useBranches(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.branches.lists(),
    queryFn: ({ signal }) => api.get('/admin/branches', { signal }),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export type BranchFilters = { type: string; isActive: string };

/**
 * Filiallar sahifasi (D-033) — backend filtri bilan. Ro'yxat sahifalanmaydi:
 * endpoint massiv qaytaradi (filial soni o'nlab, yuzlab emas).
 * 🔒 Filial xodimi faqat O'Z filialini oladi — backendda.
 */
export function useBranchList(filters: Partial<BranchFilters>) {
  const type = (['RETAIL', 'CENTRAL'] as const).find((t) => t === filters.type) as BranchType | undefined;
  const query = {
    ...(type ? { type } : {}),
    ...(filters.isActive === 'true' || filters.isActive === 'false' ? { isActive: filters.isActive === 'true' } : {}),
  };
  return useQuery({
    queryKey: queryKeys.branches.list(query),
    queryFn: ({ signal }) => api.get('/admin/branches', { query, signal }),
  });
}

/** Faqat SUPER_ADMIN. `type` keyin o'zgarmaydi. */
export function useCreateBranch() {
  return useMutation({
    mutationFn: (body: CreateBranchBody) => api.post('/admin/branches', { body }),
    meta: { invalidates: [queryKeys.branches.all] },
  });
}

/** SUPER_ADMIN — hammasi; filial admini / moderator — faqat o'zinikining kontaktlari. */
export function useUpdateBranch() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBranchBody }) =>
      api.patch('/admin/branches/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.branches.all] },
  });
}

/** Yopish (soft delete) — tarix saqlanadi; qayta ochish `PATCH { isActive: true }`. */
export function useCloseBranch() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/branches/{id}', { params: { id } }),
    meta: { invalidates: [queryKeys.branches.all] },
  });
}

/** Bino surati — eski surat almashtiriladi. Tur fayl MAZMUNIDAN aniqlanadi (backend). */
export function useUploadBranchImage() {
  return useMutation({
    mutationFn: ({ id, file, ...options }: { id: string; file: File } & UploadOptions) => {
      const body = new FormData();
      body.append('file', file);
      return api.upload('/admin/branches/{id}/image', { params: { id }, body, ...options });
    },
    meta: { invalidates: [queryKeys.branches.all] },
  });
}
