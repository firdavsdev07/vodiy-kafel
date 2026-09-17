import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { KpiSource } from './kpi';

/** Ko'rsatkichlar fonda yangilanadi — bosh sahifa ochiq tursa ham eskirmasin (❓ 4). */
const REFETCH_INTERVAL = 60_000;

/**
 * Bosh sahifa statistikasi — BITTA so'rov (D-041, api B-063).
 *
 * ⚠ `branchId` YUBORILMAYDI: filial tokendan (G5). SUPER_ADMIN butun
 *   tizim bo'yicha ko'radi, filial xodimi — o'z filiali.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: ({ signal }) => api.get('/admin/dashboard/stats', { signal }),
    refetchInterval: REFETCH_INTERVAL,
  });
}

/**
 * Statistikada YO'Q kesimlar uchun son — ro'yxatning `total` i (`limit=1`).
 *
 * Faqat ikki holat qoldi: menejerning shaxsiy ro'yxati va ta'minot
 * buyurtmalari. Qolgan hamma kartochka `useDashboardStats` dan.
 */
export function useKpiCount(
  source: Extract<KpiSource, { kind: 'orders' | 'supplyReview' | 'supplyBranch' }>,
  enabled = true,
) {
  const base = { page: 1, limit: 1 };
  return useQuery({
    queryKey:
      source.kind === 'orders'
        ? queryKeys.orders.list({ kpi: true, ...source.query })
        : queryKeys.supplyOrders.list({ kpi: source.kind, ...source.query }),
    queryFn: async ({ signal }) => {
      switch (source.kind) {
        case 'orders':
          return (await api.get('/admin/orders', { query: { ...base, ...source.query }, signal })).total;
        case 'supplyReview':
          return (await api.get('/admin/branch-orders', { query: { ...base, ...source.query }, signal })).total;
        case 'supplyBranch':
          return (await api.get('/branch-orders', { query: { ...base, ...source.query }, signal })).total;
      }
    },
    enabled,
    refetchInterval: REFETCH_INTERVAL,
  });
}
