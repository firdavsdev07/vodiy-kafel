import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import { toTransactionsQuery, type CreateTransactionBody, type TransactionFilters } from './transactions';

/**
 * Mijoz hisobi (D-023). Kalitlar `customers.detail(id)` ostida — mijoz
 * o'zgarsa (yoki `customers.all` invalidatsiya bo'lsa) hisob ham yangilanadi.
 */
const accountKey = (id: string) => [...queryKeys.customers.detail(id), 'account'] as const;
const transactionsKey = (id: string) => [...queryKeys.customers.detail(id), 'transactions'] as const;

export function useCustomerAccount(customerId: string) {
  return useQuery({
    queryKey: accountKey(customerId),
    queryFn: ({ signal }) =>
      api.get('/admin/customers/{id}/account', { params: { id: customerId }, signal }),
  });
}

export function useCustomerTransactions(customerId: string, params: ListParams<TransactionFilters>) {
  const query = toTransactionsQuery(params);
  return useQuery({
    queryKey: [...transactionsKey(customerId), query],
    queryFn: ({ signal }) =>
      api.get('/admin/customers/{id}/transactions', { params: { id: customerId }, query, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Qo'lda yozuv. ⚠ Yozuv O'ZGARTIRILMAYDI va O'CHIRILMAYDI (api/CLAUDE.md §9) —
 * shuning uchun bu yerda update/delete hook'i yo'q va bo'lmaydi.
 * `customers.all` — sarlavhadagi balans va ro'yxatdagi qarz ustuni ham eskiradi.
 */
export function useCreateTransaction(customerId: string) {
  return useMutation({
    mutationFn: (body: CreateTransactionBody) =>
      api.post('/admin/customers/{id}/transactions', { params: { id: customerId }, body }),
    meta: { invalidates: [queryKeys.customers.all] },
  });
}
