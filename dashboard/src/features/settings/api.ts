import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { Requisites, SettingKey, UpdateSettingBody } from './settings';

/**
 * Barcha sozlamalar (D-040). 🔒 Ko'rish — SUPER_ADMIN, BRANCH_ADMIN.
 * ⚠ Kalit D-019 (`useDiscountLimit`) bilan BIR XIL — bitta kesh, ikki joy.
 */
export function useSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.lists(),
    queryFn: ({ signal }) => api.get('/admin/settings', { signal }),
    enabled,
  });
}

/**
 * O'zgartirish — faqat SUPER_ADMIN. Darhol kuchga kiradi: "kam qoldi"
 * chegarasi zaxira holatini o'zgartiradi — `productStocks` va `products` ham eskiradi.
 */
export function useUpdateSetting() {
  return useMutation({
    // `value` generatsiyada erkin JSON (`Record<string, never>`) — turi kalitga qarab
    // shu yerda aniq beriladi; tekshiruv formada va backendda
    mutationFn: ({ key, value }: { key: SettingKey; value: number | Requisites | null }) =>
      api.patch('/admin/settings', { body: { key, value: value as unknown as UpdateSettingBody['value'] } }),
    meta: { invalidates: [queryKeys.settings.all, queryKeys.productStocks.all, queryKeys.products.all] },
  });
}
