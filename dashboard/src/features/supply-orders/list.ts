import type { Schema } from '@/shared/api';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';
import { ORDER_STATUSES } from '@/features/orders/list';

export type SupplyOrderListItem = Schema<'SupplyOrderListItemDto'>;

export type SupplyOrderFilters = { status: string; orderingBranchId: string };

/** Markaz ko'zi (D-030): holat + buyurtma bergan filial. */
export const supplyReviewConfig: ListParamsConfig<SupplyOrderFilters> = {
  filterKeys: ['status', 'orderingBranchId'],
};

/**
 * Filial ko'zi (D-032): faqat holat. 🔒 Filial — tokendan (G5), URL'dagi
 * `orderingBranchId` o'qilmaydi.
 */
export const supplyBranchConfig: ListParamsConfig<SupplyOrderFilters> = {
  filterKeys: ['status'],
};

/**
 * `GET /admin/branch-orders` va `GET /branch-orders` so'rovi — ikkalasi bir
 * xil parametr oladi. Saralash backendda qat'iy — yuborilmaydi.
 */
export function toSupplyOrdersQuery(params: ListParams<SupplyOrderFilters>) {
  const status = ORDER_STATUSES.find((s) => s === params.filters.status);
  const { orderingBranchId } = params.filters;
  return {
    page: params.page,
    limit: params.limit,
    ...(status ? { status } : {}),
    ...(orderingBranchId ? { orderingBranchId } : {}),
  };
}
