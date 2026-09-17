import { Link } from 'react-router';
import {
  useMyAccount,
  useMyTransactions,
  type AccountTransaction,
  type TransactionFilters,
} from '@/features/cabinet/account-api';
import { transactionTypeLabel } from '@/shared/lib/labels';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  BalanceText,
  DateText,
  ErrorState,
  FilterBar,
  FilterSelect,
  MoneyText,
  Pagination,
  StatusBadge,
} from '@/shared/ui';

const config: ListParamsConfig<TransactionFilters> = { filterKeys: ['type'] };

const typeOptions = (
  Object.keys(transactionTypeLabel) as (keyof typeof transactionTypeLabel)[]
).map((type) => ({ value: type, label: transactionTypeLabel[type] }));

/**
 * Hisobim: balans va harakatlar (D-057).
 *
 * ⚠ Balans — HISOBLANADIGAN qiymat (ledger), maydon emas. Frontend uni
 *   o'zi yig'masligi kerak: backend bergan raqam ko'rsatiladi
 *   (CLAUDE.md qoida 9). `BalanceText` qarz/avansni rang + SO'Z bilan
 *   ajratadi (rang yolg'iz signal emas).
 */
export default function CabinetAccountPage() {
  const account = useMyAccount();
  const list = useListParams<TransactionFilters>(config);
  const transactions = useMyTransactions(list.params);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 sm:grid-cols-3">
        {account.error ? (
          <div className="sm:col-span-3">
            <ErrorState error={account.error} onRetry={() => void account.refetch()} compact />
          </div>
        ) : (
          <>
            <Tile label="Jami xarid">
              <MoneyText value={account.data?.totalPurchased} className="text-md font-semibold" />
            </Tile>
            <Tile label="Jami to‘langan">
              <MoneyText value={account.data?.totalPaid} className="text-md font-semibold" />
            </Tile>
            <Tile label="Balans">
              {account.data ? (
                <BalanceText value={account.data.balance} />
              ) : (
                <span className="text-muted">…</span>
              )}
            </Tile>
          </>
        )}
      </section>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar hasFilters={list.hasFilters} onReset={list.resetFilters}>
          <FilterSelect
            label="Tur"
            value={list.params.filters.type}
            onChange={(value) => list.setFilter('type', value)}
            allLabel="Barcha turlar"
            options={typeOptions}
          />
        </FilterBar>

        {transactions.error ? (
          <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
        ) : transactions.isPending ? (
          <div aria-hidden className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : transactions.data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {list.hasFilters ? 'Bu turdagi harakat yo‘q' : 'Hozircha harakat yo‘q'}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {transactions.data.items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ul>
            <Pagination
              page={transactions.data.page}
              limit={transactions.data.limit}
              total={transactions.data.total}
              totalPages={transactions.data.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: AccountTransaction }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <StatusBadge kind="transaction" value={transaction.type} />
      <div className="min-w-0 flex-1">
        <DateText value={transaction.createdAt} className="text-xs text-muted" />
        {transaction.orderNumber && transaction.orderId && (
          <>
            {' · '}
            <Link
              to={`/kabinet/buyurtmalar/${transaction.orderId}`}
              className="font-mono text-xs hover:underline"
            >
              {transaction.orderNumber}
            </Link>
          </>
        )}
        {transaction.note && <p className="text-xs text-muted">{transaction.note}</p>}
      </div>
      {/* G6: summa satr ustida formatlanadi, `Number()` ga aylantirilmaydi */}
      <MoneyText value={transaction.amount} className="font-medium" />
    </li>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-baseline justify-between">{children}</div>
    </div>
  );
}
