import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChangeStatusBody } from '@/features/orders/status';
import { api, ApiError } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import type { CreateSupplyOrderBody } from './create';
import { toSupplyOrdersQuery, type SupplyOrderFilters } from './list';

/** Yangi ta'minot buyurtmasi kelishini markaz sahifani yangilamasdan ko'rsin (❓ 4). */
const REFETCH_INTERVAL = 60_000;

/**
 * Ta'minot buyurtmalari — MARKAZ ko'zi (D-030). 🔒 SUPER_ADMIN, MODERATOR.
 * Filial tomoni (`/branch-orders`) — D-032, boshqa endpoint.
 */
export function useSupplyOrdersForReview(params: ListParams<SupplyOrderFilters>) {
  const query = toSupplyOrdersQuery(params);
  return useQuery({
    queryKey: queryKeys.supplyOrders.list({ side: 'review', ...query }),
    queryFn: ({ signal }) => api.get('/admin/branch-orders', { query, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/** Ta'minot buyurtmasi kartasi — markaz ko'zi (D-031). Mijoz buyurtmasi bu yo'lda 404. */
export function useSupplyOrderForReview(id: string) {
  return useQuery({
    queryKey: queryKeys.supplyOrders.detail(id),
    queryFn: ({ signal }) => api.get('/admin/branch-orders/{id}', { params: { id }, signal }),
    enabled: id !== '',
  });
}

/**
 * Ta'minot buyurtmasi holati (D-031) — `useChangeOrderStatus` bilan bir xil
 * qoidalar: optimistik EMAS, 400/409 da karta qayta yuklanadi.
 * `orders.all` — ta'minot buyurtmasi umumiy "Buyurtmalar" ro'yxatida ham bor.
 */
export function useChangeSupplyOrderStatus(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangeStatusBody) => api.patch('/admin/branch-orders/{id}/status', { params: { id }, body }),
    meta: { invalidates: [queryKeys.supplyOrders.all, queryKeys.orders.all] },
    onError: (error) => {
      if (error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 409)) {
        void client.invalidateQueries({ queryKey: queryKeys.supplyOrders.all });
      }
    },
  });
}

// ── Filial tomoni (D-032): `/branch-orders` — BRANCH_ADMIN, MANAGER ──
// 🔒 Buyurtma bergan filial — TOKENDAN (G5); so'rovda filial yuborilmaydi.

export function useBranchSupplyOrders(params: ListParams<SupplyOrderFilters>) {
  const query = toSupplyOrdersQuery(params);
  return useQuery({
    queryKey: queryKeys.supplyOrders.list({ side: 'branch', ...query }),
    queryFn: ({ signal }) => api.get('/branch-orders', { query, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useBranchSupplyOrder(id: string) {
  return useQuery({
    queryKey: [...queryKeys.supplyOrders.detail(id), 'branch'],
    queryFn: ({ signal }) => api.get('/branch-orders/{id}', { params: { id }, signal }),
    enabled: id !== '',
  });
}

/** Yuborish — takrorlanmaydi (mutatsiya `retry: false`); 409 — omborda yetarli emas. */
export function useCreateSupplyOrder() {
  return useMutation({
    mutationFn: (body: CreateSupplyOrderBody) => api.post('/branch-orders', { body }),
    meta: { invalidates: [queryKeys.supplyOrders.all, queryKeys.orders.all] },
  });
}

/** Ochiq ma'lumotnomalar — yetkazib berish tanlovi uchun (kam o'zgaradi). */
export function usePublicRegions(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.regions.list({ public: true }),
    queryFn: ({ signal }) => api.get('/regions', { signal }),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function usePublicTransportTypes(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.transportTypes.list({ public: true }),
    queryFn: ({ signal }) => api.get('/transport-types', { signal }),
    enabled,
    staleTime: 10 * 60_000,
  });
}
