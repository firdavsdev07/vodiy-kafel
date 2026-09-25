import { UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useChangeOrderStatus, useOrder } from '@/features/orders/api';
import { useCan } from '@/features/auth/hooks';
import { ConfirmPaymentDialog } from '@/features/orders/ConfirmPaymentDialog';
import { AssignManagerModal, UrgentToggle } from '@/features/orders/OrderAssignControls';
import { BackLink, Card, DeliveryCard, OrderItemsCard, StatusHistoryCard } from '@/features/orders/OrderDetailParts';
import { OrderStatusActions } from '@/features/orders/OrderStatusActions';
import { SetDeliveryForm } from '@/features/orders/SetDeliveryForm';
import { buyerOf, canEditDelivery, isManuallyConfirmable, type OrderDetail, type OrderPayment } from '@/features/orders/detail';
import { formatUzPhone } from '@/shared/lib/format';
import { orderingTypeLabel, orderSourceLabel, paymentMethodLabel } from '@/shared/lib/labels';
import { Badge, Button, DateText, ErrorState, MoneyText, PageLoading, StatusBadge } from '@/shared/ui';

/**
 * Buyurtma kartasi (D-025). Amallar: holat (D-026), biriktirish va
 * tezkor (D-027), to'lov tasdig'i (D-029).
 *
 * ⚠ Narx — buyurtma paytidagi NUSXA (api/CLAUDE.md §8). Mahsulotning hozirgi
 *   narxi bilan farq qilishi mumkin va bu xato emas — UI uni "yangilamaydi".
 * 🔒 Begona filial buyurtmasi — backend 404 → "Topilmadi".
 */
export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const order = useOrder(id);
  const changeStatus = useChangeOrderStatus(id);
  const canAssign = useCan('orders.assign');
  const [assigning, setAssigning] = useState(false);
  const canConfirmPayment = useCan('payments.confirm');
  // T-004: yo'nalish va yo'l kira — faqat moderator va bosh admin
  const canSetDelivery = useCan('orders.setDelivery');
  const [confirming, setConfirming] = useState<OrderPayment | null>(null);

  if (order.isPending) return <PageLoading />;
  if (order.error || !order.data) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <BackLink to="/orders" label="Buyurtmalar" />
        <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
      </div>
    );
  }

  const o = order.data;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <BackLink to="/orders" label="Buyurtmalar" />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span className="font-mono">{o.orderNumber}</span>
            <StatusBadge kind="order" value={o.status} />
            {o.isUrgent && <Badge tone="danger">Tezkor</Badge>}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <DateText value={o.createdAt} />·<span>{orderSourceLabel[o.source]}</span>·
            <span>{o.branch?.name ?? o.branchName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Jami</p>
          <MoneyText value={o.grandTotal} className="text-lg font-semibold" />
        </div>
      </header>

      <section aria-label="Buyurtma amallari" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <OrderStatusActions orderNumber={o.orderNumber} allowed={o.allowedNextStatuses} change={changeStatus} />
        <UrgentToggle order={o} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Xaridor">
          <BuyerInfo order={o} />
        </Card>
        <Card title="Mas’ul menejer">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {o.manager ? <p className="text-sm">{o.manager.fullName}</p> : <p className="text-sm text-muted">Biriktirilmagan</p>}
            {canAssign && (
              <Button size="sm" onClick={() => setAssigning(true)}>
                <UserRoundCog size={14} aria-hidden />
                {o.manager ? 'O‘zgartirish' : 'Biriktirish'}
              </Button>
            )}
          </div>
          {canAssign && <AssignManagerModal order={o} open={assigning} onClose={() => setAssigning(false)} />}
        </Card>
      </div>

      <OrderItemsCard order={o} />

      <div className="grid gap-4 md:grid-cols-2">
        <DeliveryCard order={o} pickupText="Olib ketish — mijoz omborning o‘zidan oladi">
          {canSetDelivery && canEditDelivery(o) && <SetDeliveryForm key={o.id} order={o} />}
        </DeliveryCard>

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
                  <div className="flex flex-wrap items-center gap-2">
                    <MoneyText value={p.amount} className="font-medium" />
                    <StatusBadge kind="payment" value={p.status} />
                    {canConfirmPayment && isManuallyConfirmable(p) && (
                      <Button size="sm" variant="primary" onClick={() => setConfirming(p)}>
                        Tasdiqlash
                      </Button>
                    )}
                  </div>
                  {p.status === 'PENDING' && p.method === 'CARD' && (
                    <p className="w-full text-xs text-muted">Karta to‘lovi avtomatik tasdiqlanadi — qo‘lda emas.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {confirming && (
            <ConfirmPaymentDialog
              key={confirming.id}
              payment={confirming}
              orderNumber={o.orderNumber}
              buyerName={buyerOf(o).name}
              onClose={() => setConfirming(null)}
            />
          )}
        </Card>
      </div>

      <StatusHistoryCard entries={o.statusHistory} showActor />
    </div>
  );
}

function BuyerInfo({ order }: { order: OrderDetail }) {
  const b = buyerOf(order);
  if (b.kind === 'branch') {
    return (
      <div className="text-sm">
        <p className="font-medium">{b.name}</p>
        <p className="text-xs text-muted">{orderingTypeLabel.BRANCH} — markaziy ombordan</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      {b.kind === 'customer' ? (
        <Link to={`/customers/${b.customerId}`} className="w-fit font-medium hover:underline">
          {b.name}
        </Link>
      ) : (
        <p className="font-medium">{b.name}</p>
      )}
      <p className="text-xs text-muted">
        {b.kind === 'customer' ? orderingTypeLabel[order.orderingType] : 'Hisobsiz xaridor (qo‘lda kiritilgan)'}
      </p>
      {b.kind === 'customer' && b.contactName && <p>{b.contactName}</p>}
      {b.phone && (
        <a href={`tel:${b.phone}`} className="w-fit tabular-nums hover:underline">
          {formatUzPhone(b.phone)}
        </a>
      )}
    </div>
  );
}
