import { useSearchParams } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import {
  useCreateRegion,
  useCreateTransportType,
  useDeactivateRegion,
  useDeactivateTransportType,
  useRegionList,
  useTransportTypeList,
  useUpdateRegion,
  useUpdateTransportType,
} from '@/features/delivery/api';
import { DictionarySection } from '@/features/delivery/DictionarySection';
import { TariffMatrixSection } from '@/features/delivery/TariffMatrixSection';

const VIEWS = [
  ['tariffs', 'Tariflar'],
  ['regions', 'Viloyatlar'],
  ['transport', 'Transport turlari'],
] as const;
type View = (typeof VIEWS)[number][0];

/**
 * Yetkazib berish (EPIC 7): tarif matritsasi (D-039), viloyatlar (D-037),
 * transport turlari (D-038). Bo'lim va filtr URL'da (`?view=`, `?isActive=`).
 */
export default function DeliveryPage() {
  const [search, setSearch] = useSearchParams();
  const view: View = VIEWS.find(([id]) => id === search.get('view'))?.[0] ?? 'tariffs';
  const isActive = search.get('isActive') ?? undefined;

  const setView = (id: View) => setSearch(id === 'tariffs' ? {} : { view: id }, { replace: true });
  const setActive = (value: string | undefined) =>
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set('isActive', value);
        else next.delete('isActive');
        return next;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Yetkazib berish bo‘limlari" className="flex gap-1 overflow-x-auto border-b border-line">
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm whitespace-nowrap ${
              view === id ? 'border-accent font-medium text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'tariffs' && <TariffMatrixSection />}
      {view === 'regions' && <RegionsSection isActive={isActive} onActiveChange={setActive} />}
      {view === 'transport' && <TransportTypesSection isActive={isActive} onActiveChange={setActive} />}
    </div>
  );
}

/**
 * Viloyatlar (D-037). ❓ Yakuniy ro'yxat mijozdan kelmagan (9-savol) — CRUD
 * bor, ish to'xtamaydi. 🔒 Yozish — faqat SUPER_ADMIN.
 */
function RegionsSection({ isActive, onActiveChange }: { isActive: string | undefined; onActiveChange: (v: string | undefined) => void }) {
  const canWrite = useCan('delivery.write');
  const regions = useRegionList(isActive);
  return (
    <DictionarySection
      texts={{
        singular: 'Viloyat',
        addLabel: 'Yangi viloyat',
        empty: 'Hozircha viloyat qo‘shilmagan',
        deactivateHint: 'Viloyat tanlovda ko‘rinmaydi va unga yetkazib berishni hisoblab bo‘lmaydi. Eski buyurtmalar va tariflar saqlanadi.',
      }}
      query={regions}
      filter={isActive}
      onFilterChange={onActiveChange}
      canWrite={canWrite}
      withCapacity={false}
      nameMax={100}
      create={useCreateRegion()}
      update={useUpdateRegion()}
      deactivate={useDeactivateRegion()}
    />
  );
}

/**
 * Transport turlari (D-038) — nom (noyob, ≤60), sig'im (1…1000 paddon),
 * tartib. ⚠ HARDCODE EMAS: kalkulyator va formalar ro'yxatni shu yerdan oladi.
 * 🔒 Yozish — faqat SUPER_ADMIN.
 */
function TransportTypesSection({ isActive, onActiveChange }: { isActive: string | undefined; onActiveChange: (v: string | undefined) => void }) {
  const canWrite = useCan('delivery.write');
  const types = useTransportTypeList(isActive);
  return (
    <DictionarySection
      texts={{
        singular: 'Transport turi',
        addLabel: 'Yangi transport turi',
        empty: 'Hozircha transport turi qo‘shilmagan',
        deactivateHint: 'Transport turi tanlovda ko‘rinmaydi va u bilan yo‘l kira hisoblanmaydi. Eski buyurtmalar va tariflar saqlanadi.',
      }}
      query={types}
      filter={isActive}
      onFilterChange={onActiveChange}
      canWrite={canWrite}
      withCapacity
      nameMax={60}
      create={useCreateTransportType()}
      update={useUpdateTransportType()}
      deactivate={useDeactivateTransportType()}
    />
  );
}
