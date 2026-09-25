import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MAX_PALLETS, MIN_PALLETS, totalPallets, type CartLine } from '@/features/cabinet/cart';
import { cartStore, useCart } from '@/features/cabinet/cart-store';
import { PalletInput } from '@/features/cabinet/PalletInput';
import { LocationPicker } from '@/features/cabinet/LocationPicker';
import { EMPTY_ROUTE, useDeliveryOptions, useQuote } from '@/features/cabinet/quote-api';
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
 * ⚠ Yetkazib berish (T-004, 2026-09-25): mijoz VILOYAT TANLAMAYDI —
 *   faqat "olib ketaman / yetkazib bering", afzal ko'rgan transport va
 *   xaritadagi nuqta. Qaysi ombordan jo'natish, yo'nalish va yo'l kirani
 *   buyurtmadan keyin moderator yoki bosh admin belgilaydi; shungacha
 *   hisobda yo'l kira "belgilanadi" deb turadi (summa — faqat mahsulot).
 */
export default function CabinetCartPage() {
  const navigate = useNavigate();
  const lines = useCart();
  const [delivery, setDelivery] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [transportTypeId, setTransportTypeId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [point, setPoint] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { transportTypes } = useDeliveryOptions();
  // Yo'nalishsiz — faqat mahsulot summasi; yo'l kirani moderator qo'shadi
  const quote = useQuote(lines, EMPTY_ROUTE);
  const createOrder = useCreateOrder();

  const pallets = totalPallets(lines);
  const pickup = delivery === 'PICKUP';
  // T-005: zaxira yetmaydigan qatorlar — backend faqat "yetadi/yetmaydi" aytadi
  // (aniq son sir). Buyurtma bunday holatda 409 bilan qaytardi — oldindan yopamiz.
  const shortIds = new Set(
    (quote.data?.items ?? []).filter((item) => !item.enoughStock).map((item) => item.productId),
  );
  const stockShortage = quote.data?.stockShortage ?? false;

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
        ...(pickup
          ? {}
          : { deliveryRequested: true, ...(transportTypeId ? { transportTypeId } : {}) }),
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
            <CartRow key={line.productId} line={line} short={shortIds.has(line.productId)} />
          ))}
        </ul>

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Yetkazib berish</h2>
            <Link to="/kabinet/kalkulyator" className="text-xs text-accent hover:underline">
              Sig‘imni oldindan hisoblash →
            </Link>
          </div>
          <div role="radiogroup" aria-label="Yetkazib berish usuli" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['PICKUP', 'O‘zim olib ketaman', 'Yo‘l kira yo‘q'],
                ['DELIVERY', 'Yetkazib berish kerak', 'Yo‘l kirani menejer belgilaydi'],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  delivery === value ? 'border-fg bg-surface-muted' : 'border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  value={value}
                  checked={delivery === value}
                  onChange={() => {
                    setDelivery(value);
                    if (value === 'PICKUP') setPoint({ lat: '', lng: '' });
                  }}
                  className="mt-0.5 size-4 accent-accent"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{title}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          {!pickup && (
            <>
              <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted">
                Yuk qaysi ombordan jo‘natilishi va yo‘l kira narxini buyurtmangizni ko‘rib chiqqach
                menejer belgilaydi — u buyurtma sahifasida ko‘rinadi.
              </p>
              <label className="flex flex-col gap-1 text-xs text-muted sm:max-w-xs">
                Afzal ko‘rgan transport (ixtiyoriy)
                <select
                  value={transportTypeId}
                  disabled={transportTypes.isPending}
                  onChange={(event) => setTransportTypeId(event.target.value)}
                  className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
                >
                  <option value="">Farqi yo‘q</option>
                  {(transportTypes.data ?? []).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} · {type.capacityPallets} paddon
                    </option>
                  ))}
                </select>
              </label>
            </>
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
              {pickup ? (
                <Row label="Yo‘l kira (olib ketish)" money={quote.data.deliveryTotal} />
              ) : (
                <Row label="Yo‘l kira" value="Menejer belgilaydi" />
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2">
              <dt className="font-medium">{pickup ? 'Jami' : 'Jami (yo‘l kirasiz)'}</dt>
              <dd>
                <MoneyText value={quote.data.grandTotal} className="text-md font-semibold" />
              </dd>
            </div>
          </dl>
        )}

        <p className="text-xs text-muted">
          Yakuniy summa buyurtma berilganda backendda qayta hisoblanadi.
        </p>

        {stockShortage && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
            Ba’zi mahsulot omborda so‘ralgan miqdorda yo‘q. Belgilangan qatorlarda paddon sonini
            kamaytiring — shundan keyin buyurtma berish mumkin.
          </p>
        )}

        {formError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs whitespace-pre-line text-danger">
            {formError}
          </p>
        )}

        <Button
          variant="primary"
          pending={createOrder.isPending}
          disabled={pallets === 0 || quote.isPending || Boolean(quote.error) || stockShortage}
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

function CartRow({ line, short }: { line: CartLine; short: boolean }) {
  const step = (delta: number) => cartStore.setPallets(line.productId, line.pallets + delta);

  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-surface p-3 ${
        short ? 'border-danger' : 'border-line'
      }`}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/kabinet/mahsulot/${line.slug}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {line.name}
        </Link>
        {/* ⚠ Qatorda narx SAQLANMAYDI — u eskirib qolardi (backend beradi) */}
        {short ? (
          <p role="alert" className="text-xs text-danger">
            Omborda buncha yo‘q — paddon sonini kamaytiring
          </p>
        ) : (
          <p className="text-xs text-muted">Narx va summa hisobda ko‘rsatiladi</p>
        )}
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
        <PalletInput
          id={`pallets-${line.productId}`}
          value={line.pallets}
          onChange={(pallets) => cartStore.setPallets(line.productId, pallets)}
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
