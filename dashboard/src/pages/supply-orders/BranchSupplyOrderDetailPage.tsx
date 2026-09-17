import { useParams } from 'react-router';
import { BackLink, Card, DeliveryCard, OrderItemsCard, StatusHistoryCard } from '@/features/orders/OrderDetailParts';
import { useBranchSupplyOrder } from '@/features/supply-orders/api';
import { paymentMethodLabel } from '@/shared/lib/labels';
import { DateText, ErrorState, MoneyText, PageLoading, StatusBadge } from '@/shared/ui';

/**
 * O'z yuborgan ta'minot buyurtmasi — filial ko'zi (D-032). Faqat O'QISH:
 * holatni markaz o'zgartiradi (D-031). 🔒 Boshqa filialniki — backend 404.
 */
export default function BranchSupplyOrderDetailPage() {
  const { id = '' } = useParams();
  const order = useBranchSupplyOrder(id);
  const back = <BackLink to="/supply-orders" label="Ta’minot buyurtmalari" />;

  if (order.isPending) return <PageLoading />;
  if (order.error || !order.data) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {back}
        <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
      </div>
    );
  }

  const o = order.data;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {back}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span className="font-mono">{o.orderNumber}</span>
            <StatusBadge kind="order" value={o.status} />
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <DateText value={o.createdAt} />·<span>{o.branchName} dan</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Jami</p>
          <MoneyText value={o.grandTotal} className="text-lg font-semibold" />
        </div>
      </header>

      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        Holatni markaziy ombor o‘zgartiradi — o‘zgarishlar shu yerda va holat tarixida ko‘rinadi.
      </p>

      <OrderItemsCard order={o} />

      <div className="grid gap-4 md:grid-cols-2">
        <DeliveryCard order={o} pickupText="Olib ketish — markaziy omborning o‘zidan olasiz" />
        <Card title="To‘lov">
          {o.payments.length === 0 ? (
            <p className="text-sm text-muted">To‘lov yaratilmagan</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <span className="font-medium">{paymentMethodLabel[p.method]}</span>
                  <span className="flex items-center gap-2">
                    <MoneyText value={p.amount} className="font-medium" />
                    <StatusBadge kind="payment" value={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <StatusHistoryCard entries={o.statusHistory} showActor={false} />
    </div>
  );
}
