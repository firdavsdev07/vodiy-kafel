import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { KpiSource } from './kpi';

/** Ko'rsatkichlar fonda yangilanadi — bosh sahifa ochiq tursa ham eskirmasin (❓ 4). */
const REFETCH_INTERVAL = 60_000;

/**
 * Bitta kartochka soni — ro'yxatning `total` i, `limit=1`.
 * Kalit tegishli domen ostida — buyurtma/mijoz o'zgarganda son ham yangilanadi.
 */
export function useKpiCount(source: KpiSource) {
  const base = { page: 1, limit: 1 };
  return useQuery({
    queryKey:
      source.kind === 'orders'
        ? queryKeys.orders.list({ kpi: true, ...source.query })
        : source.kind === 'customers'
          ? queryKeys.customers.list({ kpi: true, ...source.query })
          : queryKeys.supplyOrders.list({ kpi: source.kind, ...source.query }),
    queryFn: async ({ signal }) => {
      switch (source.kind) {
        case 'orders':
          return (await api.get('/admin/orders', { query: { ...base, ...source.query }, signal })).total;
        case 'customers':
          return (await api.get('/admin/customers', { query: { ...base, ...source.query }, signal })).total;
        case 'supplyReview':
          return (await api.get('/admin/branch-orders', { query: { ...base, ...source.query }, signal })).total;
        case 'supplyBranch':
          return (await api.get('/branch-orders', { query: { ...base, ...source.query }, signal })).total;
      }
    },
    refetchInterval: REFETCH_INTERVAL,
  });
}
