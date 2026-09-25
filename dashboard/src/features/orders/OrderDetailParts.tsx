import { ArrowLeft, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Schema } from '@/shared/api';
import { orderStatusLabel } from '@/shared/lib/labels';
import type { OrderStatus } from '@/shared/lib/status-tone';
import { DateText, MoneyText } from '@/shared/ui';
import { formatQuantity, isZeroAmount } from './detail';

/**
 * Buyurtma kartasining umumiy qismlari — mijoz buyurtmasi (D-025) va
 * ta'minot buyurtmasi (D-031, D-032) bir xil ko'rinadi: backend ham ikkalasini
 * bitta `Order` mexanizmi bilan yuritadi (B-058).
 */

type Totals = {
  items: readonly Schema<'OrderItemResponseDto'>[];
  totalPallets: number;
  totalSqm: string;
  totalWeightKg: string;
  itemsTotal: string;
  deliveryTotal: string;
  grandTotal: string;
  delivery?: Schema<'OrderDeliveryDto'> | null;
  /** T-004: yetkazib berish so'ralgan, yo'nalishni moderator hali bermagan */
  deliveryPending?: boolean;
  requestedTransportTypeName?: string | null;
  exactLat?: number | null;
  exactLng?: number | null;
  dispatchBranch?: { name: string } | null;
  note?: string | null;
};

export function Card({ title, children, flush = false }: { title: string; children: ReactNode; flush?: boolean }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h3 className="border-b border-line px-4 py-2.5 text-sm font-medium">{title}</h3>
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeft size={15} aria-hidden />
      {label}
    </Link>
  );
}

/**
 * Mahsulotlar jadvali. ⚠ Narx — buyurtma paytidagi NUSXA (api/CLAUDE.md §8).
 * `linkProducts` — mahsulot kartasiga havola (katalogni ko'ra oladigan rolda).
 */
export function OrderItemsCard({ order, linkProducts = true }: { order: Totals; linkProducts?: boolean }) {
  return (
    <Card title="Mahsulotlar" flush>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Buyurtma mahsulotlari</caption>
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2 text-left font-medium">Mahsulot</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Paddon</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">m²</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Og‘irlik, kg</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Narx, 1 m²</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Summa</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId} className="border-b border-line">
                <td className="px-4 py-2.5">
                  {linkProducts ? (
                    <Link to={`/products/${item.productId}`} className="font-medium hover:underline">
                      {item.productName}
                    </Link>
                  ) : (
                    <span className="font-medium">{item.productName}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{item.pallets}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatQuantity(item.sqm)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatQuantity(item.weightKg)}</td>
                <td className="px-4 py-2.5 text-right"><MoneyText value={item.pricePerSqm} /></td>
                <td className="px-4 py-2.5 text-right"><MoneyText value={item.lineTotal} className="font-medium" /></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr className="border-b border-line">
              <th scope="row" className="px-4 py-2 text-left font-medium">Jami</th>
              <td className="px-4 py-2 text-right font-medium tabular-nums">{order.totalPallets}</td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">{formatQuantity(order.totalSqm)}</td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">{formatQuantity(order.totalWeightKg)}</td>
              <td />
              <td className="px-4 py-2 text-right"><MoneyText value={order.itemsTotal} className="font-medium" /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="flex gap-2 px-4 py-3 text-xs text-muted">
        <Info size={14} className="mt-px shrink-0" aria-hidden />
        Narxlar buyurtma berilgan paytdagi nusxa. Mahsulot narxi keyin o‘zgargan bo‘lsa ham bu buyurtma o‘zgarmaydi.
      </p>
    </Card>
  );
}

/**
 * Yetkazib berish + summa taqsimoti. Hammasi API qiymatlari — frontendda
 * qo'shilmaydi (G1). `children` — kartaning pastida (masalan moderatorning
 * "yetkazib berishni belgilash" formasi, T-004).
 */
export function DeliveryCard({
  order,
  pickupText,
  children,
}: {
  order: Totals;
  pickupText: string;
  children?: ReactNode;
}) {
  return (
    <Card title="Yetkazib berish">
      {order.dispatchBranch && (
        <p className="mb-2 text-sm">
          <span className="text-muted">Jo‘natish joyi: </span>
          {order.dispatchBranch.name}
        </p>
      )}
      {order.deliveryPending ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
            Mijoz yetkazib berishni so‘ragan — yo‘nalish va yo‘l kira hali belgilanmagan.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted">Afzal transport</dt>
            <dd>{order.requestedTransportTypeName ?? 'Farqi yo‘q'}</dd>
            {order.exactLat != null && order.exactLng != null && (
              <>
                <dt className="text-muted">Manzil</dt>
                <dd className="tabular-nums">
                  {order.exactLat}, {order.exactLng}
                </dd>
              </>
            )}
          </dl>
        </div>
      ) : order.delivery ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Viloyat</dt>
          <dd>{order.delivery.regionName}</dd>
          <dt className="text-muted">Transport</dt>
          <dd>
            {order.delivery.transportTypeName} × {order.delivery.vehicleCount}
          </dd>
          {order.delivery.exactLat != null && order.delivery.exactLng != null && (
            <>
              <dt className="text-muted">Manzil</dt>
              <dd className="tabular-nums">
                {order.delivery.exactLat}, {order.delivery.exactLng}
              </dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-sm">{pickupText}</p>
      )}
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-line pt-3 text-sm">
        <dt className="text-muted">Mahsulotlar</dt>
        <dd className="text-right"><MoneyText value={order.itemsTotal} /></dd>
        <dt className="text-muted">Yo‘l kira</dt>
        <dd className="text-right">
          {order.deliveryPending ? (
            <span className="text-warning">Belgilanmagan</span>
          ) : isZeroAmount(order.deliveryTotal) ? (
            <span className="text-muted">—</span>
          ) : (
            <MoneyText value={order.deliveryTotal} />
          )}
        </dd>
        <dt className="font-medium">Jami</dt>
        <dd className="text-right"><MoneyText value={order.grandTotal} className="font-semibold" /></dd>
      </dl>
      {order.note && (
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm whitespace-pre-line">
          <span className="text-xs text-muted">Izoh: </span>
          {order.note}
        </p>
      )}
      {children}
    </Card>
  );
}

type HistoryEntry = {
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
  changedBy?: { fullName: string } | null;
};

/**
 * Holat tarixi — vaqt chizig'i. `showActor` — kim o'zgartirgani (admin DTO'da
 * bor; filial tomonidagi DTO'da maydon umuman yo'q).
 */
export function StatusHistoryCard({ entries, showActor }: { entries: readonly HistoryEntry[]; showActor: boolean }) {
  return (
    <Card title="Holat tarixi">
      <ol className="flex flex-col">
        {entries.map((h, i) => (
          <li key={`${i}-${h.status}`} className="relative flex gap-3 pb-4 last:pb-0">
            {i < entries.length - 1 && <span aria-hidden className="absolute top-3 left-[5px] h-full w-px bg-line" />}
            <span
              aria-hidden
              className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 ${i === entries.length - 1 ? 'border-accent bg-accent' : 'border-line-strong bg-surface'}`}
            />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{orderStatusLabel[h.status]}</p>
              <p className="text-xs text-muted">
                <DateText value={h.createdAt} />
                {showActor && <> · {h.changedBy?.fullName ?? 'Tizim / mijoz'}</>}
              </p>
              {h.note && <p className="mt-1 whitespace-pre-line text-muted">{h.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
