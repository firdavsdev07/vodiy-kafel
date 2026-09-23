import { Truck } from 'lucide-react';
import { useState } from 'react';
import { useDeliveryOptions } from '@/features/cabinet/quote-api';
import { ErrorState } from '@/shared/ui';

/**
 * Mustaqil sig'im kalkulyatori (D-063) — savat va buyurtomadan MUSTAQIL.
 *
 * ⚠ Narx hisoblamaydi — faqat "nechta mashina kerak" (TZ 3.3: "fura
 *   hisobi paddon soniga nisbatan"). Narx faqat savatda (`/kabinet/savat`,
 *   `POST /calculator/quote`) — bu yerda umuman yo'q.
 *
 * `GET /transport-types` OCHIQ endpoint, `capacityPallets` ni qaytaradi
 * (`useDeliveryOptions`, savat sahifasida ham shu hook ishlatiladi) —
 * yangi backend so'rovi kerak emas, hisob butunlay frontendda.
 */
export default function CabinetCalculatorPage() {
  const [pallets, setPallets] = useState('');
  const { transportTypes } = useDeliveryOptions();

  const count = Number(pallets);
  const valid = pallets.trim() !== '' && Number.isFinite(count) && count > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Sig‘im kalkulyatori</h2>
        <p className="text-xs text-muted">
          Nechta paddon yuborishni bilsangiz, har bir transport turiga nechta mashina kerakligini
          shu yerda hisoblab ko‘ring — buyurtma berish shart emas.
        </p>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nechta paddon yuborasiz?
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={pallets}
            onChange={(event) => setPallets(event.target.value)}
            placeholder="Masalan: 40"
            className="h-10 w-40 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg tabular-nums"
          />
        </label>
      </section>

      {transportTypes.error ? (
        <ErrorState error={transportTypes.error} onRetry={() => void transportTypes.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <h3 className="border-b border-line px-4 py-2.5 text-sm font-medium">
            Transport turlari bo‘yicha sig‘im
          </h3>
          {transportTypes.isPending ? (
            <div aria-hidden className="flex flex-col gap-2 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-surface-muted" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {transportTypes.data.map((type) => (
                <li key={type.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Truck size={16} className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 font-medium">{type.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    1 mashinaga {type.capacityPallets} paddon
                  </span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {valid ? `${Math.ceil(count / type.capacityPallets)} mashina` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
