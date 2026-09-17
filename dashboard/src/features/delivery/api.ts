import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { DictionaryBody } from './dictionary';
import type { Tariff, UpsertTariffBody } from './tariffs';

const activeQuery = (isActive: string | undefined) =>
  isActive === 'true' || isActive === 'false' ? { isActive: isActive === 'true' } : {};

// ── Viloyatlar (D-037). Ko'rish — barcha xodim; yozish — SUPER_ADMIN ──

export function useRegionList(isActive?: string) {
  const query = activeQuery(isActive);
  return useQuery({
    queryKey: queryKeys.regions.list({ admin: true, ...query }),
    queryFn: ({ signal }) => api.get('/admin/regions', { query, signal }),
  });
}

/** Viloyat nomi/holati o'zgarsa — tariflar va ochiq tanlovlar ham eskiradi. */
const regionInvalidates = [queryKeys.regions.all, queryKeys.tariffs.all];

export function useCreateRegion() {
  return useMutation({
    mutationFn: (body: DictionaryBody) =>
      api.post('/admin/regions', { body: { name: body.name ?? '', ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }) } }),
    meta: { invalidates: regionInvalidates },
  });
}

export function useUpdateRegion() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DictionaryBody & { isActive?: boolean } }) => {
      const { capacityPallets: _ignored, ...rest } = body;
      return api.patch('/admin/regions/{id}', { params: { id }, body: rest });
    },
    meta: { invalidates: regionInvalidates },
  });
}

/** Soft delete — tanlovda ko'rinmaydi, eski buyurtmalar saqlanadi. */
export function useDeactivateRegion() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/regions/{id}', { params: { id } }),
    meta: { invalidates: regionInvalidates },
  });
}

// ── Transport turlari (D-038). HARDCODE EMAS (api/CLAUDE.md §5) ──
// Sig'im o'zgarsa — faqat YANGI hisoblarga ta'sir qiladi (buyurtmada mashina soni surat).

export function useTransportTypeList(isActive?: string) {
  const query = activeQuery(isActive);
  return useQuery({
    queryKey: queryKeys.transportTypes.list({ admin: true, ...query }),
    queryFn: ({ signal }) => api.get('/admin/transport-types', { query, signal }),
  });
}

const transportInvalidates = [queryKeys.transportTypes.all, queryKeys.tariffs.all];

export function useCreateTransportType() {
  return useMutation({
    mutationFn: (body: DictionaryBody) =>
      api.post('/admin/transport-types', {
        body: {
          name: body.name ?? '',
          capacityPallets: body.capacityPallets ?? 0,
          ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
        },
      }),
    meta: { invalidates: transportInvalidates },
  });
}

export function useUpdateTransportType() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DictionaryBody & { isActive?: boolean } }) =>
      api.patch('/admin/transport-types/{id}', { params: { id }, body }),
    meta: { invalidates: transportInvalidates },
  });
}

/** Soft delete — tanlovda ko'rinmaydi, u bilan hisoblab bo'lmaydi; eski buyurtmalar saqlanadi. */
export function useDeactivateTransportType() {
  return useMutation({
    mutationFn: (id: string) => api.delete('/admin/transport-types/{id}', { params: { id } }),
    meta: { invalidates: transportInvalidates },
  });
}

// ── Tarif matritsasi (D-039). Ko'rish — barcha xodim; yozish — SUPER_ADMIN, BRANCH_ADMIN ──

const TARIFF_PAGE = 100;

/**
 * Bitta filialning BARCHA tariflari — matritsa to'liq bo'lishi kerak.
 * Filtr backendda (`branchId`); bir filialda viloyat × transport odatda
 * bir sahifaga sig'adi, sig'masa — keyingi sahifalar ham olinadi.
 * 🔒 Filial xodimi uchun `branchId` yuborilmaydi — backend o'z filialini beradi (G5).
 */
export function useBranchTariffMatrix(branchId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tariffs.list({ matrix: true, branchId }),
    queryFn: async ({ signal }) => {
      const all: Tariff[] = [];
      for (let page = 1; ; page++) {
        const res = await api.get('/admin/tariffs', {
          query: { page, limit: TARIFF_PAGE, ...(branchId ? { branchId } : {}) },
          signal,
        });
        all.push(...res.items);
        if (page >= res.totalPages) return all;
      }
    },
    enabled,
  });
}

/** Ommaviy saqlash — o'zgargan kataklar uchun PUT (upsert). Oxirida bitta invalidatsiya. */
export function useSaveTariffs() {
  return useMutation({
    mutationFn: (upserts: UpsertTariffBody[]) => Promise.all(upserts.map((body) => api.put('/admin/tariffs', { body }))),
    meta: { invalidates: [queryKeys.tariffs.all] },
  });
}
