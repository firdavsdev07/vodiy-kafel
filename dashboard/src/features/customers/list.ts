import type { Schema } from '@/shared/api';
import type { QueryOf } from '@/shared/api/types';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';

export type CustomerListItem = Schema<'AdminCustomerListItemDto'>;
export type CustomerFilters = { search: string; branchId: string; isActive: string; hasDebt: string };

/**
 * 🔒 Filial filtri FAQAT SUPER_ADMIN va MODERATOR ga (G5, T-001). Filial admini o'z filialini
 * backenddan oladi — frontendda qo'shimcha filtr QO'YILMAYDI.
 */
export const superAdminCustomerConfig: ListParamsConfig<CustomerFilters> = {
  filterKeys: ['search', 'branchId', 'isActive', 'hasDebt'],
};
export const branchCustomerConfig: ListParamsConfig<CustomerFilters> = {
  filterKeys: ['search', 'isActive', 'hasDebt'],
};

const bool = (v: string | undefined) => (v === 'true' || v === 'false' ? v === 'true' : undefined);

export function toCustomersQuery(params: ListParams<CustomerFilters>): QueryOf<'/admin/customers', 'get'> {
  const { search, branchId, isActive, hasDebt } = params.filters;
  const active = bool(isActive);
  const debt = bool(hasDebt);
  return {
    page: params.page,
    limit: params.limit,
    ...(search ? { search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(active === undefined ? {} : { isActive: active }),
    ...(debt === undefined ? {} : { hasDebt: debt }),
  };
}
