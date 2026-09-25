import { Plus, UserRoundCog, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { createContext, use, useState } from 'react';
import { useProfile } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { useManagerFilterOptions, useOrders } from '@/features/orders/api';
import { AssignManagerModal, UrgentToggle } from '@/features/orders/OrderAssignControls';
import {
  branchOrderConfig,
  isDateRangeInvalid,
  isQuickFilterActive,
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  quickFilters,
  superAdminOrderConfig,
  toggleQuickFilter,
  type OrderFilters,
  type OrderListItem,
} from '@/features/orders/list';
import { formatUzPhone } from '@/shared/lib/format';
import { orderingTypeLabel, orderSourceLabel, orderStatusLabel, paymentStatusLabel } from '@/shared/lib/labels';
import { can } from '@/shared/lib/permissions';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  DataTable,
  IconButton,
  DateText,
  FilterBar,
  FilterSelect,
  MoneyText,
  Pagination,
  StatusBadge,
  tableColumns,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<OrderListItem>();

const numberColumn = col.accessor('orderNumber', {
  header: 'Raqam',
  size: 170,
  cell: ({ row }) => (
    <div className="flex flex-col gap-1">
      <span className="font-mono font-medium whitespace-nowrap">{row.original.orderNumber}</span>
      {row.original.isUrgent && (
        // Rang yagona signal emas — so'z ham bor
        <span className="w-fit">
          <Badge tone="danger">Tezkor</Badge>
        </span>
      )}
    </div>
  ),
});

const buyerColumn = col.display({
  id: 'buyer',
  header: 'Xaridor',
  size: 230,
  cell: ({ row }) => {
    const o = row.original;
    if (!o.buyer) {
      // Filial ta'minot buyurtmasi — xaridor filialning o'zi (B-058)
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{o.branch?.name ?? '—'}</p>
          <p className="text-xs text-muted">{orderingTypeLabel[o.orderingType]}</p>
        </div>
      );
    }
    return (
      <div className="min-w-0">
        <p className="truncate font-medium">{o.buyer.name}</p>
        <p className="truncate text-xs text-muted">
          {o.buyer.customerId ? orderingTypeLabel[o.orderingType] : 'Hisobsiz xaridor'}
          {o.buyer.phone && <span className="tabular-nums"> · {formatUzPhone(o.buyer.phone)}</span>}
        </p>
      </div>
    );
  },
});

const branchColumn = col.accessor((o) => o.branch?.name ?? '—', { id: 'branch', header: 'Filial', size: 140 });

const tailColumns: DataTableColumn<OrderListItem>[] = [
  col.accessor('grandTotal', {
    header: 'Summa',
    size: 140,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <MoneyText value={row.original.grandTotal} className="font-medium" />
        <span className="text-xs text-muted tabular-nums">{row.original.totalPallets} paddon</span>
      </div>
    ),
  }),
  col.accessor('status', {
    header: 'Holat',
    size: 170,
    cell: (c) => <StatusBadge kind="order" value={c.getValue()} />,
  }),
  col.accessor('paymentStatus', {
    header: 'To‘lov',
    size: 130,
    cell: (c) => {
      const v = c.getValue();
      return v ? <StatusBadge kind="payment" value={v} /> : <span className="text-muted">—</span>;
    },
  }),
  col.accessor((o) => o.manager?.fullName, {
    id: 'manager',
    header: 'Menejer',
    size: 150,
    cell: (c) => c.getValue() ?? <span className="text-muted">Biriktirilmagan</span>,
  }),
  col.accessor('createdAt', {
    header: 'Sana',
    size: 130,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <DateText value={row.original.createdAt} />
        <span className="text-xs text-muted">{orderSourceLabel[row.original.source]}</span>
      </div>
    ),
  }),
];

/** Qator amallari (D-027): tezkor — hammaga; biriktirish — `orders.assign` ga (null bo'lsa yo'q). */
const AssignContext = createContext<((o: OrderListItem) => void) | null>(null);
const actionsColumn = col.display({
  id: 'actions',
  size: 88,
  header: () => <span className="sr-only">Amallar</span>,
  meta: { align: 'right' },
  cell: ({ row }) => <RowActions order={row.original} />,
});

const superAdminColumns: DataTableColumn<OrderListItem>[] = [numberColumn, buyerColumn, branchColumn, ...tailColumns, actionsColumn];
const branchColumns: DataTableColumn<OrderListItem>[] = [numberColumn, buyerColumn, ...tailColumns, actionsColumn];

const statusOptions = ORDER_STATUSES.map((v) => ({ value: v, label: orderStatusLabel[v] }));
const sourceOptions = ORDER_SOURCES.map((v) => ({ value: v, label: orderSourceLabel[v] }));
const paymentOptions = PAYMENT_STATUSES.map((v) => ({ value: v, label: paymentStatusLabel[v] }));
const urgentOptions = [
  { value: 'true', label: 'Faqat tezkor' },
  { value: 'false', label: 'Oddiy' },
] as const;

/**
 * Buyurtmalar ro'yxati (D-024). Filtrlar URL'da — havolani hamkasbga
 * yuborsa o'sha ko'rinish ochiladi. Tezkor buyurtma qatori ajratiladi.
 *
 * 🔒 Filial filtri va ustuni — SUPER_ADMIN va MODERATOR (G5, T-001: moderator
 *    barcha filial mijoz buyurtmalarini ko'radi). Menejer filtri —
 *    `managers.view` ruxsati borga (menejerlar ro'yxati faqat ularga ochiq).
 */
export default function OrdersPage() {
  const profile = useProfile().data;
  const allBranches = can(profile?.role, 'customers.allBranches');
  const canFilterManager = can(profile?.role, 'managers.view');
  const list = useListParams<OrderFilters>(allBranches ? superAdminOrderConfig : branchOrderConfig);
  const { filters } = list.params;
  const rangeInvalid = isDateRangeInvalid(filters);

  const orders = useOrders(list.params);
  const branches = useBranches(allBranches);
  const managers = useManagerFilterOptions(canFilterManager, filters.branchId);
  const page = orders.data;

  const quick = quickFilters(profile ? { id: profile.id, isManager: profile.role === 'MANAGER' } : null);
  const canAssign = can(profile?.role, 'orders.assign');
  const [assigning, setAssigning] = useState<OrderListItem | null>(null);

  return (
    <AssignContext value={canAssign ? setAssigning : null}>
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div role="group" aria-label="Tez filtrlar" className="flex flex-wrap gap-2 border-b border-line px-4 pt-4 pb-3">
          {quick.map((q) => {
            const active = isQuickFilterActive(q, filters);
            return (
              <button
                key={q.id}
                type="button"
                aria-pressed={active}
                onClick={() => list.update({ filters: toggleQuickFilter(q, filters) })}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                  active
                    ? 'border-accent bg-accent font-medium text-accent-contrast'
                    : 'border-line-strong text-muted hover:text-fg'
                }`}
              >
                {q.id === 'urgent' && <Zap size={13} aria-hidden />}
                {q.label}
              </button>
            );
          })}
        </div>

        <FilterBar
          search={filters.search}
          onSearchChange={(v) => list.setFilter('search', v)}
          searchPlaceholder="Raqam, kompaniya, ism yoki telefon…"
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            <Link
              to="/orders/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:opacity-90"
            >
              <Plus size={16} aria-hidden />
              Yangi buyurtma
            </Link>
          }
        >
          <FilterSelect label="Holat" value={filters.status} onChange={(v) => list.setFilter('status', v)} options={statusOptions} />
          <FilterSelect label="To‘lov" value={filters.paymentStatus} onChange={(v) => list.setFilter('paymentStatus', v)} options={paymentOptions} />
          <FilterSelect label="Tezkorlik" value={filters.isUrgent} onChange={(v) => list.setFilter('isUrgent', v)} options={urgentOptions} />
          <FilterSelect label="Manba" value={filters.source} onChange={(v) => list.setFilter('source', v)} options={sourceOptions} />
          {allBranches && (
            <FilterSelect
              label="Filial"
              value={filters.branchId}
              onChange={(v) => list.update({ filters: { branchId: v, managerId: undefined } })}
              loading={branches.isPending}
              allLabel="Barcha filiallar"
              options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          {canFilterManager && (
            <FilterSelect
              label="Menejer"
              value={filters.managerId}
              onChange={(v) => list.setFilter('managerId', v)}
              loading={managers.isPending}
              allLabel="Barcha menejerlar"
              options={(managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName }))}
            />
          )}
          <DateFilter label="Sanadan" value={filters.dateFrom} onChange={(v) => list.setFilter('dateFrom', v)} invalid={rangeInvalid} />
          <DateFilter label="Sanagacha" value={filters.dateTo} onChange={(v) => list.setFilter('dateTo', v)} invalid={rangeInvalid} />
        </FilterBar>
        {rangeInvalid && (
          <p role="alert" className="border-b border-line bg-danger-soft px-4 py-2 text-sm text-danger">
            “Sanadan” “Sanagacha”dan keyin bo‘lmasligi kerak.
          </p>
        )}
      </div>

      <DataTable
        caption="Buyurtmalar"
        columns={allBranches ? superAdminColumns : branchColumns}
        data={page?.items}
        getRowId={(o) => o.id}
        isLoading={orders.isPending}
        isFetching={orders.isPlaceholderData}
        error={orders.error}
        onRetry={() => void orders.refetch()}
        rowHref={(o) => `/orders/${o.id}`}
        rowClassName={(o) => (o.isUrgent ? 'bg-danger-soft/50 shadow-[inset_3px_0_0_var(--color-danger)]' : '')}
        emptyText={list.hasFilters ? 'Filtrga mos buyurtma topilmadi' : 'Hozircha buyurtma yo‘q'}
        footer={
          page && (
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              limit={list.params.limit}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
              disabled={orders.isPlaceholderData}
            />
          )
        }
      />
      {assigning && <AssignManagerModal key={assigning.id} order={assigning} open onClose={() => setAssigning(null)} />}
    </div>
    </AssignContext>
  );
}

function RowActions({ order }: { order: OrderListItem }) {
  const openAssign = use(AssignContext);
  return (
    <div className="flex justify-end gap-1">
      <UrgentToggle order={order} compact />
      {openAssign && (
        <IconButton label={`${order.orderNumber} — mas’ul xodimni tanlash`} onClick={() => openAssign(order)}>
          <UserRoundCog size={15} aria-hidden />
        </IconButton>
      )}
    </div>
  );
}

/** Sana filtri — Toshkent kuni (`YYYY-MM-DD`); API ga aylantirish `toOrdersQuery` da. */
function DateFilter({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  invalid: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        type="date"
        value={value ?? ''}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={`h-9 rounded-md border bg-surface px-2 text-sm text-fg ${invalid ? 'border-danger' : 'border-line-strong'}`}
      />
    </label>
  );
}
