import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { AddTransactionModal } from '@/features/accounts/AddTransactionModal';
import { useCustomerAccount, useCustomerTransactions } from '@/features/accounts/api';
import {
  isNegativeAmount,
  transactionListConfig,
  type AccountTransaction,
  type TransactionFilters,
} from '@/features/accounts/transactions';
import { useCustomerOutlet } from '@/features/customers/use-customer-outlet';
import { formatMoney } from '@/shared/lib/format';
import { transactionTypeLabel } from '@/shared/lib/labels';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  BalanceText,
  Button,
  DateText,
  ErrorState,
  FilterSelect,
  MoneyText,
  PageLoading,
  Pagination,
  StatusBadge,
} from '@/shared/ui';

const typeFilterOptions = (['DEBT', 'PAYMENT', 'ADJUSTMENT'] as const).map((t) => ({
  value: t,
  label: transactionTypeLabel[t],
}));

/**
 * "Hisob" tab (D-023): balans kartasi, tranzaksiyalar jadvali, qo'lda yozuv.
 *
 * ⚠ Yozuv TAHRIRLANMAYDI va O'CHIRILMAYDI (api/CLAUDE.md §9) — jadvalda
 *   bunday tugma YO'Q. Xato — teskari ishorali "Tuzatish" bilan qaytariladi.
 * 🔒 Yozish — `accounts.write` (SUPER_ADMIN, BRANCH_ADMIN, MODERATOR).
 */
export default function CustomerAccountTab() {
  const c = useCustomerOutlet();
  const canWrite = useCan('accounts.write');
  const account = useCustomerAccount(c.id);
  const list = useListParams<TransactionFilters>(transactionListConfig);
  const transactions = useCustomerTransactions(c.id, list.params);
  const [adding, setAdding] = useState(false);

  if (account.isPending) return <PageLoading />;
  if (account.error) {
    return <ErrorState error={account.error} onRetry={() => void account.refetch()} retrying={account.isFetching} />;
  }

  const summary = account.data;
  const page = transactions.data;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Balans" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Joriy balans" hint="Musbat — qarz, manfiy — avans">
          <BalanceText value={summary.balance} />
        </SummaryCard>
        <SummaryCard label="Jami qarzga yozilgan" hint="Buyurtmalar va musbat tuzatishlar">
          <MoneyText value={summary.totalPurchased} className="font-medium" />
        </SummaryCard>
        <SummaryCard label="Jami to‘langan" hint="To‘lovlar va manfiy tuzatishlar">
          <MoneyText value={summary.totalPaid} className="font-medium" />
        </SummaryCard>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Hisob harakatlari</h3>
          <p className="mt-0.5 text-xs text-muted">
            Yozuvlar o‘zgartirilmaydi — xatoni tuzatish uchun teskari “Tuzatish” kiriting.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Tur"
            value={list.params.filters.type}
            onChange={(v) => list.setFilter('type', v)}
            options={typeFilterOptions}
          />
          {canWrite && (
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              <Plus size={15} aria-hidden />
              Yozuv qo‘shish
            </Button>
          )}
        </div>
      </div>

      {transactions.isPending ? (
        <PageLoading />
      ) : transactions.error ? (
        <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} retrying={transactions.isFetching} />
      ) : page && page.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {list.hasFilters ? 'Bu turdagi yozuv yo‘q' : 'Hozircha hisob harakati yo‘q'}
        </p>
      ) : page ? (
        <div className="overflow-x-auto rounded-md border border-line" aria-busy={transactions.isFetching || undefined}>
          <table className="w-full text-sm">
            <caption className="sr-only">Hisob harakatlari</caption>
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 text-left font-medium">Sana</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Tur</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Summa</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Izoh</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Buyurtma</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Kiritgan</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((t) => (
                <TransactionRow key={t.id} t={t} />
              ))}
            </tbody>
          </table>
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            limit={list.params.limit}
            onPageChange={list.setPage}
            onLimitChange={list.setLimit}
            disabled={transactions.isFetching}
          />
        </div>
      ) : null}

      {canWrite && (
        <AddTransactionModal open={adding} customerId={c.id} customerName={c.companyName} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function SummaryCard({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-muted px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex min-h-10 items-center [&>span]:items-start">{children}</div>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function TransactionRow({ t }: { t: AccountTransaction }) {
  const negative = isNegativeAmount(t.amount);
  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="px-3 py-2 whitespace-nowrap"><DateText value={t.createdAt} /></td>
      <td className="px-3 py-2"><StatusBadge kind="transaction" value={t.type} /></td>
      <td className={`px-3 py-2 text-right font-medium whitespace-nowrap tabular-nums ${negative ? 'text-success' : 'text-danger'}`}>
        {/* formatMoney manfiyga "−" qo'yadi; musbatga "+" o'zimiz */}
        {negative ? formatMoney(t.amount) : `+${formatMoney(t.amount)}`}
      </td>
      <td className="max-w-64 px-3 py-2 break-words">{t.note ?? <span className="text-muted">—</span>}</td>
      <td className="px-3 py-2">
        {t.orderId && t.orderNumber ? (
          <Link to={`/orders/${t.orderId}`} className="font-mono hover:underline">{t.orderNumber}</Link>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-muted">{t.createdBy?.fullName ?? 'Tizim'}</td>
    </tr>
  );
}
