import { ArrowLeft, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useManagerContact,
  useMyOrder,
  type CustomerOrder,
  type PaymentMethod,
} from '@/features/cabinet/orders-api';
import { StatusHistoryCard } from '@/features/orders/OrderDetailParts';
import {
  isFinalPaymentStatus,
  paymentSimulationAvailable,
  usePaymentStatus,
  useSimulatePayment,
  useStartPayment,
} from '@/features/cabinet/payments-api';
import { errorMessage } from '@/shared/lib/error-message';
import { orderSourceLabel, paymentMethodLabel } from '@/shared/lib/labels';
import {
  Button,
  DateText,
  ErrorState,
  MoneyText,
  PageLoading,
  StatusBadge,
  toast,
} from '@/shared/ui';

const PAYMENT_METHODS: readonly PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER'];

/**
 * Buyurtma kartasi (D-056) + to'lov (D-055).
 *
 * ⚠ Narx — buyurtma paytidagi SNAPSHOT: mahsulot narxi keyin o'zgarsa ham
 *   bu yerdagi raqamlar o'zgarmaydi va UI ularni QAYTA HISOBLAMAYDI
 *   (CLAUDE.md qoida 8).
 *
 * 🔒 Boshqa mijozning buyurtmasi ID bilan so'ralsa backend 404 beradi
 *    (403 emas — IDOR himoyasi).
 */
export default function CabinetOrderDetailPage() {
  const { id = '' } = useParams();
  const order = useMyOrder(id);

  if (order.isPending) return <PageLoading />;
  if (order.error) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />;

  const data = order.data;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/kabinet/buyurtmalar"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} aria-hidden />
        Buyurtmalarim
      </Link>

      <header className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-mono text-md font-semibold">{data.orderNumber}</h2>
          <p className="text-xs text-muted">
            <DateText value={data.createdAt} /> · {data.branchName} ·{' '}
            {orderSourceLabel[data.source]}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatusBadge kind="order" value={data.status} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <h3 className="border-b border-line px-4 py-3 text-sm font-medium">Mahsulotlar</h3>
            <ul className="divide-y divide-line">
              {data.items.map((item) => (
                <li key={item.productId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/kabinet/mahsulot/${item.productSlug}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted tabular-nums">
                      {item.pallets} paddon · {item.sqm} m² · {item.weightKg} kg ·{' '}
                      <MoneyText value={item.pricePerSqm} currency={false} /> /m²
                    </p>
                  </div>
                  <MoneyText value={item.lineTotal} className="text-sm font-medium" />
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
            <h3 className="text-sm font-medium">Yetkazib berish</h3>
            {data.delivery ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Viloyat" value={data.delivery.regionName} />
                <Field label="Transport" value={data.delivery.transportTypeName} />
                <Field label="Mashina soni" value={String(data.delivery.vehicleCount)} />
                {data.delivery.exactLat != null && data.delivery.exactLng != null && (
                  <Field
                    label="Xaritadagi nuqta"
                    value={`${data.delivery.exactLat}, ${data.delivery.exactLng}`}
                  />
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted">Olib ketish — yo‘l kira yo‘q.</p>
            )}
          </section>

          <StatusHistoryCard entries={data.statusHistory} showActor={false} />

          {data.note && (
            <section className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4">
              <h3 className="text-sm font-medium">Izoh</h3>
              <p className="text-sm whitespace-pre-line text-muted">{data.note}</p>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
            <h3 className="text-sm font-medium">Summa</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Mahsulotlar" money={data.itemsTotal} />
              <Row label="Yo‘l kira" money={data.deliveryTotal} />
              <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2">
                <dt className="font-medium">Jami</dt>
                <dd>
                  <MoneyText value={data.grandTotal} className="text-md font-semibold" />
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted">
              Narxlar buyurtma berilgan paytdagi holatda saqlangan.
            </p>
          </section>

          <PaymentSection order={data} />
          <ManagerContact orderId={data.id} />
        </div>
      </div>
    </div>
  );
}

/**
 * To'lov (D-055): mavjud yozuvlar + yangi to'lovni boshlash va holatini
 * kuzatish.
 *
 * ⚠ Usul nomlari yagona lug'atdan keladi; provayder nomi (Payme/Click)
 *   kodda YOZILMAYDI — backend hali mock (api B-050).
 */
function PaymentSection({ order }: { order: CustomerOrder }) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [started, setStarted] = useState<{ id: string; method: PaymentMethod } | null>(null);
  const paymentId = started?.id ?? null;
  const start = useStartPayment(order.id);
  const status = usePaymentStatus(paymentId);
  const simulate = useSimulatePayment(paymentId);

  const pending = order.payments.find((payment) => payment.status === 'PENDING');
  const paid = order.payments.some((payment) => payment.status === 'PAID');
  const live = status.data;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h3 className="text-sm font-medium">To‘lov</h3>

      {order.payments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {order.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge kind="payment" value={payment.status} />
              <span className="text-xs text-muted">{paymentMethodLabel[payment.method]}</span>
              <MoneyText value={payment.amount} className="ml-auto text-sm" />
              {payment.paidAt && <DateText value={payment.paidAt} className="text-xs text-muted" />}
            </li>
          ))}
        </ul>
      )}

      {paid ? (
        <p className="text-sm text-success">To‘lov qabul qilindi.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Usul
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {paymentMethodLabel[item]}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="primary"
            pending={start.isPending}
            onClick={() =>
              start.mutate(method, {
                onSuccess: (result) => {
                  setStarted({ id: result.paymentId, method: result.method });
                  toast.success('To‘lov boshlandi');
                },
                onError: toast.error,
              })
            }
          >
            {pending ? 'To‘lovni qayta boshlash' : 'To‘lovni boshlash'}
          </Button>

          {start.error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
              {errorMessage(start.error)}
            </p>
          )}

          {live && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge kind="payment" value={live.status} />
                {!isFinalPaymentStatus(live.status) && (
                  <span className="text-xs text-muted">holat kuzatilmoqda…</span>
                )}
              </div>
              {/* 🧪 Dev qulayligi: backendda `/dev/*` faqat development'da bor.
                  ⚠ Faqat PROVAYDER orqali ochilgan to'lovda ma'noli: naqd va
                  o'tkazmani backend simulyatsiya qilmaydi ("Bu to'lov provayder
                  orqali ochilmagan") — tugma bo'lsa ham xato qaytarardi. */}
              {paymentSimulationAvailable && started?.method === 'CARD' && !isFinalPaymentStatus(live.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    pending={simulate.isPending}
                    onClick={() =>
                      simulate.mutate('PAID', { onError: toast.error })
                    }
                  >
                    🧪 To‘landi (dev)
                  </Button>
                  <Button
                    size="sm"
                    pending={simulate.isPending}
                    onClick={() => simulate.mutate('FAILED', { onError: toast.error })}
                  >
                    🧪 Xato (dev)
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** «Menejer bilan bog'lanish» (D-056) — telefon/Telegram faqat so'ralganda olinadi. */
function ManagerContact({ orderId }: { orderId: string }) {
  const [asked, setAsked] = useState(false);
  const contact = useManagerContact(orderId, asked);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
      <h3 className="text-sm font-medium">Menejer bilan bog‘lanish</h3>

      {!asked ? (
        <Button onClick={() => setAsked(true)}>
          <Phone size={15} aria-hidden />
          Aloqa ma’lumotini ko‘rsatish
        </Button>
      ) : contact.isPending ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : contact.error ? (
        <ErrorState error={contact.error} onRetry={() => void contact.refetch()} compact />
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{contact.data.fullName}</p>
          {contact.data.telegramUrl ? (
            <a
              href={contact.data.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline"
            >
              <Send size={14} aria-hidden />
              Telegram orqali yozish
            </a>
          ) : (
            <p className="text-xs text-muted">Telegram havolasi ko‘rsatilmagan.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, money }: { label: string; money: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>
        <MoneyText value={money} />
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
