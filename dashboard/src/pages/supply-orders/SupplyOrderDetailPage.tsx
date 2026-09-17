import { useParams } from 'react-router';
import { BackLink, Card, DeliveryCard, OrderItemsCard, StatusHistoryCard } from '@/features/orders/OrderDetailParts';
import { OrderStatusActions } from '@/features/orders/OrderStatusActions';
import { useChangeSupplyOrderStatus, useSupplyOrderForReview } from '@/features/supply-orders/api';
import { paymentMethodLabel } from '@/shared/lib/labels';
import { DateText, ErrorState, MoneyText, PageLoading, StatusBadge } from '@/shared/ui';

/**
 * Ta'minot buyurtmasi kartasi — markaz ko'zi (D-031). 🔒 SUPER_ADMIN,
 * MODERATOR. Holat tugmalari FAQAT `allowedNextStatuses` dan (G8).
 * Filial tomoni (o'z yuborganini ko'rish) — D-032.
 */
export default function SupplyOrderDetailPage() {
  const { id = '' } = useParams();
  const order = useSupplyOrderForReview(id);
  const changeStatus = useChangeSupplyOrderStatus(id);
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
            <DateText value={o.createdAt} />·<span>{o.orderingBranch.name}</span>→<span>{o.branchName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Jami</p>
          <MoneyText value={o.grandTotal} className="text-lg font-semibold" />
        </div>
      </header>

      <section aria-label="Holatni o‘zgartirish" className="rounded-lg border border-line bg-surface px-4 py-3">
        <OrderStatusActions orderNumber={o.orderNumber} allowed={o.allowedNextStatuses} change={changeStatus} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Buyurtmachi">
          <p className="text-sm font-medium">{o.orderingBranch.name}</p>
          <p className="text-xs text-muted">Do‘kon filiali — markaziy ombordan ta’minot</p>
        </Card>
        <Card title="Yetkazib beruvchi">
          <p className="text-sm font-medium">{o.branchName}</p>
          <p className="text-xs text-muted">Markaziy ombor</p>
        </Card>
      </div>

      <OrderItemsCard order={o} />

      <div className="grid gap-4 md:grid-cols-2">
        <DeliveryCard order={o} pickupText="Olib ketish — filial markaziy omborning o‘zidan oladi" />
        <Card title="To‘lov">
          {o.payments.length === 0 ? (
            <p className="text-sm text-muted">To‘lov yaratilmagan</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{paymentMethodLabel[p.method]}</p>
                    <p className="text-xs text-muted">
                      {p.paidAt ? <>To‘langan: <DateText value={p.paidAt} /></> : 'Hali to‘lanmagan'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MoneyText value={p.amount} className="font-medium" />
                    <StatusBadge kind="payment" value={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Ta'minot DTO'sida `changedBy` yo'q — kim o'zgartirgani ko'rsatilmaydi */}
      <StatusHistoryCard entries={o.statusHistory} showActor={false} />
    </div>
  );
}
