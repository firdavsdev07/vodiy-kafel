import { ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router';
import { useMyOrders, type CustomerOrderListItem, type OrderFilters } from '@/features/cabinet/orders-api';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { orderStatusLabel } from '@/shared/lib/labels';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  DateText,
  ErrorState,
  FilterBar,
  FilterSelect,
  MoneyText,
  Pagination,
  StatusBadge,
} from '@/shared/ui';

const config: ListParamsConfig<OrderFilters> = { filterKeys: ['status'] };

const statusOptions = (
  Object.keys(orderStatusLabel) as (keyof typeof orderStatusLabel)[]
).map((status) => ({ value: status, label: orderStatusLabel[status] }));

/**
 * Mening buyurtmalarim (D-056).
 *
 * ⚠ Jadval EMAS, kartochka ro'yxati: kabinet telefonda ishlatiladi
 *   (D-051). Holat nomlari — yagona lug'atdan (D-043).
 */
export default function CabinetOrdersPage() {
  const list = useListParams<OrderFilters>(config);
  const orders = useMyOrders(list.params);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar hasFilters={list.hasFilters} onReset={list.resetFilters}>
          <FilterSelect
            label="Holat"
            value={list.params.filters.status}
            onChange={(value) => list.setFilter('status', value)}
            allLabel="Barcha holatlar"
            options={statusOptions}
          />
        </FilterBar>
      </div>

      {orders.error ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.isPending ? (
        <ListSkeleton />
      ) : orders.data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center">
          <Package size={20} className="text-muted" aria-hidden />
          <p className="font-medium">
            {list.hasFilters ? 'Bu holatda buyurtma yo‘q' : 'Hozircha buyurtma yo‘q'}
          </p>
          <p className="text-sm text-muted">Katalogdan mahsulot tanlab, savat orqali buyurtma bering.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {orders.data.items.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
          <div className="rounded-lg border border-line bg-surface [&>nav]:border-t-0">
            <Pagination
              page={orders.data.page}
              limit={orders.data.limit}
              total={orders.data.total}
              totalPages={orders.data.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrderListItem }) {
  return (
    <li>
      <Link
        to={`/kabinet/buyurtmalar/${order.id}`}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:bg-surface-muted"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
            <StatusBadge kind="order" value={order.status} />
            {/* To'lov boshlanmagan bo'lsa `paymentStatus` yo'q — yorliq ham yo'q */}
            {order.paymentStatus && <StatusBadge kind="payment" value={order.paymentStatus} />}
          </div>
          <p className="text-xs text-muted">
            <DateText value={order.createdAt} /> · {order.itemCount} xil mahsulot ·{' '}
            {order.totalPallets} paddon
            {order.regionName ? ` · ${order.regionName}` : ' · olib ketish'}
          </p>
        </div>
        {/* ⚠ Summa — buyurtma paytidagi SNAPSHOT, qayta hisoblanmaydi */}
        <MoneyText value={order.grandTotal} className="text-sm font-semibold" />
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="h-20 animate-pulse rounded-lg bg-surface-muted" />
      ))}
    </ul>
  );
}
