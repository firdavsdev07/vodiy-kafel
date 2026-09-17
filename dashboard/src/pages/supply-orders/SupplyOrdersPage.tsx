import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { ORDER_STATUSES } from '@/features/orders/list';
import { useBranchSupplyOrders, useSupplyOrdersForReview } from '@/features/supply-orders/api';
import { supplyBranchConfig, supplyReviewConfig, type SupplyOrderFilters, type SupplyOrderListItem } from '@/features/supply-orders/list';
import { orderStatusLabel } from '@/shared/lib/labels';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  DataTable,
  DateText,
  FilterBar,
  FilterSelect,
  MoneyText,
  Pagination,
  StatusBadge,
  tableColumns,
  type DataTableColumn,
} from '@/shared/ui';

/**
 * Ta'minot buyurtmalari — bitta menyu bandi, ikki tomon (navigation.ts):
 *   markaz (SUPER_ADMIN, MODERATOR) — qabul qiladi (D-030, D-031)
 *   do'kon filiali (BRANCH_ADMIN, MANAGER) — yuboradi (D-032)
 */
export default function SupplyOrdersPage() {
  const canReview = useCan('supplyOrders.review');
  return canReview ? <SupplyReviewList /> : <BranchSupplyList />;
}

const col = tableColumns<SupplyOrderListItem>();

const columns: DataTableColumn<SupplyOrderListItem>[] = [
  col.accessor('orderNumber', {
    header: 'Raqam',
    size: 160,
    cell: (c) => <span className="font-mono font-medium whitespace-nowrap">{c.getValue()}</span>,
  }),
  col.accessor((o) => o.orderingBranch.name, {
    id: 'orderingBranch',
    header: 'Buyurtmachi filial',
    size: 220,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.orderingBranch.name}</p>
        <p className="truncate text-xs text-muted">→ {row.original.centralBranch.name}</p>
      </div>
    ),
  }),
  col.accessor('grandTotal', {
    header: 'Summa',
    size: 150,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        <MoneyText value={row.original.grandTotal} className="font-medium" />
        <span className="text-xs text-muted tabular-nums">{row.original.totalPallets} paddon</span>
      </div>
    ),
  }),
  col.accessor('status', { header: 'Holat', size: 170, cell: (c) => <StatusBadge kind="order" value={c.getValue()} /> }),
  col.accessor('paymentStatus', {
    header: 'To‘lov',
    size: 130,
    cell: (c) => {
      const v = c.getValue();
      return v ? <StatusBadge kind="payment" value={v} /> : <span className="text-muted">—</span>;
    },
  }),
  col.accessor('createdAt', { header: 'Sana', size: 130, cell: (c) => <DateText value={c.getValue()} /> }),
];

/** Filial ko'zi: buyurtmachi — o'zi, ustun kerak emas; yetkazib beruvchi markaz ko'rsatiladi. */
const branchColumns: DataTableColumn<SupplyOrderListItem>[] = [
  columns[0]!,
  col.accessor((o) => o.centralBranch.name, { id: 'centralBranch', header: 'Markaziy ombor', size: 200 }),
  ...columns.slice(2),
];

const statusOptions = ORDER_STATUSES.map((v) => ({ value: v, label: orderStatusLabel[v] }));

/**
 * Markaz ko'zi (D-030). 🔒 SUPER_ADMIN, MODERATOR — backendda @Roles.
 * ⚠ Bu ro'yxatda FAQAT filial ta'minoti (`orderingType = BRANCH`). Agent
 *   (markazga biriktirilgan B2B mijoz) buyurtmalari — oddiy "Buyurtmalar"
 *   bo'limida: backend ularni mijoz buyurtmasi kabi yuritadi.
 */
function SupplyReviewList() {
  const list = useListParams<SupplyOrderFilters>(supplyReviewConfig);
  const orders = useSupplyOrdersForReview(list.params);
  const branches = useBranches(true);
  const page = orders.data;
  const { filters } = list.params;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar hasFilters={list.hasFilters} onReset={list.resetFilters}>
          <FilterSelect label="Holat" value={filters.status} onChange={(v) => list.setFilter('status', v)} options={statusOptions} />
          <FilterSelect
            label="Buyurtmachi filial"
            value={filters.orderingBranchId}
            onChange={(v) => list.setFilter('orderingBranchId', v)}
            loading={branches.isPending}
            allLabel="Barcha filiallar"
            // Ta'minot buyurtmasini faqat do'kon (RETAIL) filiali beradi
            options={(branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name }))}
          />
        </FilterBar>
        <p className="px-4 py-2 text-xs text-muted">
          Do‘kon filiallarining markaziy omborga buyurtmalari. Agent buyurtmalari — “Buyurtmalar” bo‘limida.
        </p>
      </div>

      <DataTable
        caption="Ta’minot buyurtmalari"
        columns={columns}
        data={page?.items}
        getRowId={(o) => o.id}
        isLoading={orders.isPending}
        isFetching={orders.isPlaceholderData}
        error={orders.error}
        onRetry={() => void orders.refetch()}
        rowHref={(o) => `/supply-orders/${o.id}`}
        emptyText={list.hasFilters ? 'Filtrga mos ta’minot buyurtmasi topilmadi' : 'Hozircha ta’minot buyurtmasi yo‘q'}
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
    </div>
  );
}

/**
 * Filial ko'zi (D-032): o'z yuborgan ta'minot buyurtmalari + "Markazdan
 * buyurtma". 🔒 BRANCH_ADMIN, MANAGER; filial — tokendan (G5).
 */
function BranchSupplyList() {
  const list = useListParams<SupplyOrderFilters>(supplyBranchConfig);
  const orders = useBranchSupplyOrders(list.params);
  const page = orders.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            <Link
              to="/supply-orders/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:opacity-90"
            >
              <Plus size={16} aria-hidden />
              Markazdan buyurtma
            </Link>
          }
        >
          <FilterSelect label="Holat" value={list.params.filters.status} onChange={(v) => list.setFilter('status', v)} options={statusOptions} />
        </FilterBar>
        <p className="px-4 py-2 text-xs text-muted">Filialingiz markaziy omborga yuborgan buyurtmalar. Holatni markaz o‘zgartiradi.</p>
      </div>

      <DataTable
        caption="Filial ta’minot buyurtmalari"
        columns={branchColumns}
        data={page?.items}
        getRowId={(o) => o.id}
        isLoading={orders.isPending}
        isFetching={orders.isPlaceholderData}
        error={orders.error}
        onRetry={() => void orders.refetch()}
        rowHref={(o) => `/supply-orders/${o.id}`}
        emptyText={list.hasFilters ? 'Filtrga mos buyurtma topilmadi' : 'Hozircha markazga buyurtma berilmagan'}
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
    </div>
  );
}
