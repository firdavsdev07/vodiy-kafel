import { Container } from 'lucide-react';
import { useState } from 'react';
import { useDeliveryOptions } from '@/features/cabinet/quote-api';
import { ErrorState } from '@/shared/ui';

/**
 * Mustaqil sig'im kalkulyatori (D-063) — savat va buyurtomadan MUSTAQIL.
 *
 * ⚠ Narx hisoblamaydi — faqat "nechta transport kerak" (TZ 3.3: "fura
 *   hisobi paddon soniga nisbatan"). Narx faqat savatda (`/kabinet/savat`,
 *   `POST /calculator/quote`) — bu yerda umuman yo'q.
 *
 * ⚠ Transport turi — CRUD jadval (`TransportType`), hardcode enum EMAS:
 *   "Fura" ham, "Vagon" ham, ertaga qo'shiladigani ham shu ro'yxatdan
 *   keladi. Shuning uchun matnda "mashina" deyilmaydi — vagon mashina
 *   emas; birlik sifatida turning O'Z nomi ishlatiladi.
 *
 * `GET /transport-types` OCHIQ endpoint, `capacityPallets` ni qaytaradi
 * (`useDeliveryOptions`, savat sahifasida ham shu hook ishlatiladi) —
 * yangi backend so'rovi kerak emas, hisob butunlay frontendda.
 */
export default function CabinetCalculatorPage() {
  const [pallets, setPallets] = useState('');
  const { transportTypes } = useDeliveryOptions();

  const count = Number(pallets);
  // Paddon bo'linmaydi: backend ham butun musbat son talab qiladi
  // (`CalculatorService.assertPallets`) — "2.5 paddon" uchun javob
  // ko'rsatilsa, savatda boshqa natija chiqardi.
  const valid = pallets.trim() !== '' && Number.isSafeInteger(count) && count > 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Sig‘im kalkulyatori</h2>
        <p className="text-xs text-muted">
          Nechta paddon yuborishni bilsangiz, har bir transport turidan nechtasi kerakligini
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
                  <Container size={16} className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 font-medium">{type.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    Sig‘imi: {type.capacityPallets} paddon
                  </span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {valid ? `${Math.ceil(count / type.capacityPallets)} ta ${type.name}` : '—'}
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
