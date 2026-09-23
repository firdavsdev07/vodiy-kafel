import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MAX_PALLETS, MIN_PALLETS, totalPallets, type CartLine } from '@/features/cabinet/cart';
import { cartStore, useCart } from '@/features/cabinet/cart-store';
import { LocationPicker } from '@/features/cabinet/LocationPicker';
import {
  EMPTY_ROUTE,
  isPickup,
  isRouteReady,
  useDeliveryOptions,
  useQuote,
  type RouteSelection,
} from '@/features/cabinet/quote-api';
import { useCreateOrder, type PaymentMethod } from '@/features/cabinet/orders-api';
import { errorMessage } from '@/shared/lib/error-message';
import { paymentMethodLabel } from '@/shared/lib/labels';
import { Button, ErrorState, IconButton, MoneyText, toast } from '@/shared/ui';

const PAYMENT_METHODS: readonly PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER'];
const NOTE_MAX = 1000;

/**
 * Savat, kalkulyator va buyurtma berish (D-053, D-054).
 *
 * ⚠ Savat BRAUZERDA (`localStorage`), summa esa har o'zgarishda
 *   backenddan (`POST /calculator/quote`). Frontend hech qanday narxni
 *   o'zi hisoblamaydi va yubormaydi (CLAUDE.md qoida 1).
 *
 * ⚠ Yetkazib berish: viloyat + transport BIRGA tanlanadi yoki ikkalasi
 *   ham bo'sh = olib ketish (yo'l kira 0). Yarmi tanlangan bo'lsa
 *   backend 400 beradi — bu holatda so'rov ham yuborilmaydi.
 */
export default function CabinetCartPage() {
  const navigate = useNavigate();
  const lines = useCart();
  const [route, setRoute] = useState<RouteSelection>(EMPTY_ROUTE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [point, setPoint] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { regions, transportTypes } = useDeliveryOptions();
  const quote = useQuote(lines, route);
  const createOrder = useCreateOrder();

  const pallets = totalPallets(lines);
  const routeHalfFilled = !isRouteReady(route);
  const pickup = isPickup(route);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center">
        <ShoppingCart size={22} className="text-muted" aria-hidden />
        <p className="font-medium">Savat bo‘sh</p>
        <p className="text-sm text-muted">Katalogdan mahsulot tanlang va paddon sonini kiriting.</p>
        <Link to="/kabinet">
          <Button variant="primary">Katalogga o‘tish</Button>
        </Link>
      </div>
    );
  }

  const submit = () => {
    setFormError(null);
    if (routeHalfFilled) {
      setFormError('Viloyat va transport turi BIRGA tanlanadi. Ikkalasi ham bo‘sh bo‘lsa — olib ketish.');
      return;
    }
    // Koordinata — ixtiyoriy, lekin yarmi berilishi mumkin emas (backend 400)
    const hasLat = point.lat.trim() !== '';
    const hasLng = point.lng.trim() !== '';
    if (hasLat !== hasLng) {
      setFormError('Xaritadagi nuqta uchun kenglik va uzunlik BIRGA kiritiladi.');
      return;
    }
    if (pickup && (hasLat || hasLng)) {
      setFormError('Olib ketishda xaritadagi nuqta berilmaydi.');
      return;
    }

    createOrder.mutate(
      {
        items: lines.map((line) => ({ productId: line.productId, pallets: line.pallets })),
        ...(pickup ? {} : { regionId: route.regionId, transportTypeId: route.transportTypeId }),
        ...(hasLat && hasLng
          ? { exactLat: Number(point.lat), exactLng: Number(point.lng) }
          : {}),
        paymentMethod,
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (order) => {
          cartStore.clear();
          toast.success(`Buyurtma qabul qilindi — ${order.orderNumber}`);
          void navigate(`/kabinet/buyurtmalar/${order.id}`, { replace: true });
        },
        onError: (error) => setFormError(errorMessage(error)),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <CartRow key={line.productId} line={line} />
          ))}
        </ul>

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Yetkazib berish</h2>
            <Link to="/kabinet/kalkulyator" className="text-xs text-accent hover:underline">
              Sig‘imni oldindan hisoblash →
            </Link>
          </div>
          <p className="text-xs text-muted">
            Viloyat va transport turini <strong>birga</strong> tanlang. Ikkalasi ham bo‘sh bo‘lsa —
            o‘zingiz olib ketasiz, yo‘l kira 0.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Viloyat
              <select
                value={route.regionId}
                disabled={regions.isPending}
                onChange={(event) => setRoute((r) => ({ ...r, regionId: event.target.value }))}
                className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
              >
                <option value="">Olib ketish</option>
                {(regions.data ?? []).map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Transport turi
              <select
                value={route.transportTypeId}
                disabled={transportTypes.isPending}
                onChange={(event) =>
                  setRoute((r) => ({ ...r, transportTypeId: event.target.value }))
                }
                className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
              >
                <option value="">Tanlanmagan</option>
                {(transportTypes.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} · {type.capacityPallets} paddon
                  </option>
                ))}
              </select>
            </label>
          </div>
          {routeHalfFilled && (
            <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Ikkinchisi ham tanlanmaguncha yo‘l kira hisoblanmaydi.
            </p>
          )}

          {!pickup && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <h3 className="text-sm font-medium">Xaritadagi aniq nuqta (ixtiyoriy)</h3>
              {/* ⚠ Narxga TA'SIR QILMAYDI — faqat logistika uchun (TZ 3.13) */}
              <p className="text-xs text-muted">
                Narxga ta’sir qilmaydi — haydovchi manzilni aniq topishi uchun.
              </p>
              <LocationPicker value={point} onChange={setPoint} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-medium">To‘lov usuli</h2>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  paymentMethod === method
                    ? 'border-accent bg-accent/10 font-medium'
                    : 'border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="size-4 accent-accent"
                />
                {paymentMethodLabel[method]}
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted">
            Izoh (ixtiyoriy)
            <textarea
              value={note}
              maxLength={NOTE_MAX}
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Masalan: ertalab yetkazing"
              className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg"
            />
          </label>
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-3 rounded-lg border border-line bg-surface p-4 lg:sticky lg:top-32">
        <h2 className="text-sm font-medium">Hisob</h2>

        {quote.error ? (
          <ErrorState error={quote.error} onRetry={() => void quote.refetch()} compact />
        ) : quote.isPending ? (
          <p className="text-sm text-muted">Hisoblanmoqda…</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm" aria-busy={quote.isFetching || undefined}>
            <Row label="Paddon" value={`${quote.data.totalPallets} ta`} />
            <Row label="Maydon" value={`${quote.data.totalSqm} m²`} />
            <Row label="Og‘irlik" value={`${quote.data.totalWeightKg} kg`} />
            <div className="border-t border-line pt-2">
              <Row label="Mahsulotlar" money={quote.data.itemsTotal} />
              <Row
                label={
                  quote.data.transport
                    ? `Yo‘l kira · ${quote.data.transport.transportTypeName} × ${quote.data.transport.vehicleCount}`
                    : 'Yo‘l kira (olib ketish)'
                }
                money={quote.data.deliveryTotal}
              />
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2">
              <dt className="font-medium">Jami</dt>
              <dd>
                <MoneyText value={quote.data.grandTotal} className="text-md font-semibold" />
              </dd>
            </div>
          </dl>
        )}

        <p className="text-xs text-muted">
          Yakuniy summa buyurtma berilganda backendda qayta hisoblanadi.
        </p>

        {formError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs whitespace-pre-line text-danger">
            {formError}
          </p>
        )}

        <Button
          variant="primary"
          pending={createOrder.isPending}
          disabled={pallets === 0 || routeHalfFilled || quote.isPending || Boolean(quote.error)}
          onClick={submit}
        >
          Buyurtma berish
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={createOrder.isPending}
          onClick={() => cartStore.clear()}
        >
          Savatni bo‘shatish
        </Button>
      </aside>
    </div>
  );
}

function Row({ label, value, money }: { label: string; value?: string; money?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{money !== undefined ? <MoneyText value={money} /> : value}</dd>
    </div>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const step = (delta: number) => cartStore.setPallets(line.productId, line.pallets + delta);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/kabinet/mahsulot/${line.slug}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {line.name}
        </Link>
        {/* ⚠ Qatorda narx SAQLANMAYDI — u eskirib qolardi (backend beradi) */}
        <p className="text-xs text-muted">Narx va summa hisobda ko‘rsatiladi</p>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          label="Bir paddon kamaytirish"
          onClick={() => step(-1)}
          disabled={line.pallets <= MIN_PALLETS}
        >
          <Minus size={15} aria-hidden />
        </IconButton>
        <label className="sr-only" htmlFor={`pallets-${line.productId}`}>
          {line.name} — paddon soni
        </label>
        <input
          id={`pallets-${line.productId}`}
          type="number"
          min={MIN_PALLETS}
          max={MAX_PALLETS}
          step={1}
          value={line.pallets}
          onChange={(event) => cartStore.setPallets(line.productId, Number(event.target.value))}
          className="h-9 w-20 rounded-md border border-line-strong bg-surface px-2 text-center text-sm text-fg tabular-nums"
        />
        <IconButton
          label="Bir paddon qo‘shish"
          onClick={() => step(1)}
          disabled={line.pallets >= MAX_PALLETS}
        >
          <Plus size={15} aria-hidden />
        </IconButton>
        <span className="text-xs text-muted">paddon</span>
      </div>

      <IconButton
        label={`${line.name} — savatdan olib tashlash`}
        danger
        onClick={() => cartStore.remove(line.productId)}
      >
        <Trash2 size={15} aria-hidden />
      </IconButton>
    </li>
  );
}
