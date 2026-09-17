import { useQuery } from '@tanstack/react-query';
import { api, type Page, type Schema } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type AccountSummary = Schema<'AccountSummaryDto'>;
export type AccountTransaction = Schema<'AccountTransactionDto'>;
export type TransactionFilters = { type: string };

const TYPES = ['DEBT', 'PAYMENT', 'ADJUSTMENT'] as const;
type TransactionType = (typeof TYPES)[number];
const isType = (value: string | undefined): value is TransactionType =>
  TYPES.includes(value as TransactionType);

/**
 * Mening hisobim — `GET /me/account` (D-057).
 *
 * ⚠ Balans — HISOBLANADIGAN qiymat (ledger), maydon emas (CLAUDE.md
 *   qoida 9). Frontend uni o'zi yig'masligi kerak: backend bergan raqam
 *   ishlatiladi. Musbat — qarz, manfiy — avans (`BalanceText`).
 */
export function useMyAccount() {
  return useQuery({
    queryKey: queryKeys.cabinet.account,
    queryFn: ({ signal }) => api.get('/me/account', { signal }),
  });
}

/** Hisob harakatlari — `GET /me/account/transactions` (D-057). */
export function useMyTransactions(params: ListParams<TransactionFilters>) {
  const type = params.filters.type;
  const query = {
    page: params.page,
    limit: params.limit,
    ...(isType(type) ? { type } : {}),
  };

  return useQuery({
    queryKey: queryKeys.cabinet.transactions.list(query),
    queryFn: ({ signal }) =>
      api.get('/me/account/transactions', { query, signal }) as Promise<
        Page<AccountTransaction>
      >,
  });
}
