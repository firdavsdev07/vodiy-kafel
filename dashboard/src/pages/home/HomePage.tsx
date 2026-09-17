import { ArrowLeftRight, ArrowRight, Boxes, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useKpiCount } from '@/features/home/api';
import { kpiCards, type KpiCard } from '@/features/home/kpi';
import { errorMessage } from '@/shared/lib/error-message';
import { roleLabel } from '@/shared/lib/labels';
import { toneClasses } from '@/shared/lib/status-tone';

/**
 * Bosh sahifa (D-041): rolga mos ko'rsatkichlar va tezkor amallar.
 * ⚠ Sonlar mavjud ro'yxatlardan (A varianti) — summa va dinamika backendda
 *   statistika endpointi chiqqach (api/task.txt B-063).
 */
export default function HomePage() {
  const profile = useProfile().data;
  const cards = kpiCards(profile ? { id: profile.id, role: profile.role } : undefined);
  const canOrder = useCan('orders.manage');
  const canSupply = useCan('supplyOrders.create');
  const canStock = useCan('stock.view');

  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <div>
          <h2 className="text-lg font-semibold">Xush kelibsiz, {profile.fullName}</h2>
          <p className="text-sm text-muted">{roleLabel[profile.role]}</p>
        </div>
      )}

      <section aria-label="Ko‘rsatkichlar" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiTile key={card.id} card={card} />
        ))}
      </section>

      <section aria-label="Tezkor amallar" className="flex flex-wrap gap-3">
        {canOrder && (
          <QuickLink to="/orders/new" icon={<Plus size={16} aria-hidden />}>
            Qo‘lda buyurtma kiritish
          </QuickLink>
        )}
        {canSupply && (
          <QuickLink to="/supply-orders/new" icon={<ArrowLeftRight size={16} aria-hidden />}>
            Markazdan buyurtma
          </QuickLink>
        )}
        {canStock && (
          <QuickLink to="/stock" icon={<Boxes size={16} aria-hidden />}>
            Zaxira holati
          </QuickLink>
        )}
      </section>

      <p className="text-xs text-muted">
        Sonlar har daqiqada yangilanadi. “Kam qolgan mahsulotlar” soni hozircha yo‘q — backendda zaxira holati bo‘yicha filtr yo‘q (B-063);
        holatni “Zaxira” sahifasida ko‘ring.
      </p>
    </div>
  );
}

function KpiTile({ card }: { card: KpiCard }) {
  const count = useKpiCount(card.source);
  const tone = toneClasses[card.tone];
  return (
    <Link
      to={card.href}
      className="group flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-visible:border-line-strong"
    >
      <span className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden className={`size-2 rounded-full ${tone.dot}`} />
        {card.label}
      </span>
      <span className="text-3xl font-semibold tabular-nums" aria-live="polite">
        {count.isPending ? (
          <span className="inline-block h-8 w-12 animate-pulse rounded-sm bg-surface-muted align-middle" aria-label="Yuklanmoqda" />
        ) : count.error ? (
          <span className="text-sm font-normal text-danger" title={errorMessage(count.error)}>
            Olib bo‘lmadi
          </span>
        ) : (
          count.data
        )}
      </span>
      <span className="flex items-center justify-between gap-2 text-xs text-muted">
        {card.hint}
        <ArrowRight size={14} aria-hidden className="shrink-0 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function QuickLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-muted">
      {icon}
      {children}
    </Link>
  );
}
