import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import {
  toStaffQuery,
  type CreateStaffBody,
  type ResetStaffPasswordBody,
  type StaffFilters,
  type UpdateStaffBody,
} from './staff-form';

// ── Menejerlar (D-035) — SUPER_ADMIN, BRANCH_ADMIN ──
// 🔒 Filial admini faqat o'z filiali menejerlarini ko'radi va qo'shadi (backend).

export function useManagerList(filters: Partial<StaffFilters>, enabled = true) {
  const query = toStaffQuery(filters);
  return useQuery({
    queryKey: queryKeys.managers.list({ page: 'staff', ...query }),
    queryFn: ({ signal }) => api.get('/admin/managers', { query, signal }),
    enabled,
  });
}

/**
 * 🔒 Javobda VAQTINCHALIK PAROL — `gcTime: 0`, chaqiruvchi natijani o'z
 * holatiga oladi va keshda qoldirmaydi (D-021 bilan bir xil qoida).
 */
export function useCreateManager() {
  return useMutation({
    mutationFn: (body: CreateStaffBody) => api.post('/admin/managers', { body }),
    gcTime: 0,
    meta: { invalidates: [queryKeys.managers.all] },
  });
}

/**
 * Menejerga yangi parol (api B-066).
 *
 * 🔒 Javobda ochiq parol — `gcTime: 0`: natija keshda qolmaydi,
 *    chaqiruvchi uni o'z holatiga oladi va oyna yopilganda o'chiradi
 *    (D-021 / D-035 bilan bir xil qoida).
 *
 * ⚠ Ro'yxat YANGILANMAYDI (`invalidates` yo'q): parol almashishi bilan
 *   ro'yxatdagi hech bir maydon o'zgarmaydi.
 */
export function useResetManagerPassword() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResetStaffPasswordBody }) =>
      api.post('/admin/managers/{id}/reset-password', { params: { id }, body }),
    gcTime: 0,
  });
}

export function useUpdateManager() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStaffBody }) => api.patch('/admin/managers/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.managers.all] },
  });
}

// ── Moderatorlar (D-036) — FAQAT SUPER_ADMIN ──
// Moderator — markaziy ombor (CENTRAL) xodimi (B-057).

export function useModeratorList(filters: Partial<StaffFilters>, enabled = true) {
  const query = toStaffQuery(filters);
  return useQuery({
    queryKey: queryKeys.moderators.list(query),
    queryFn: ({ signal }) => api.get('/admin/moderators', { query, signal }),
    enabled,
  });
}

/** 🔒 Javobda vaqtinchalik parol — `gcTime: 0` (menejer bilan bir xil qoida). */
export function useCreateModerator() {
  return useMutation({
    mutationFn: (body: CreateStaffBody) => api.post('/admin/moderators', { body }),
    gcTime: 0,
    meta: { invalidates: [queryKeys.moderators.all] },
  });
}

/** 🔒 Moderatorga yangi parol — menejer bilan bir xil qoida (api B-066). */
export function useResetModeratorPassword() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResetStaffPasswordBody }) =>
      api.post('/admin/moderators/{id}/reset-password', { params: { id }, body }),
    gcTime: 0,
  });
}

export function useUpdateModerator() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStaffBody }) => api.patch('/admin/moderators/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.moderators.all] },
  });
}

/**
 * Soft delete — kira olmaydi; hisob va u o'zgartirgan holat/zaxira tarixi
 * saqlanadi. Qaytarish — `PATCH { isActive: true }`.
 */
export function useDeactivateModerator() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/moderators/{id}', { params: { id } }),
    meta: { invalidates: [queryKeys.moderators.all] },
  });
}
