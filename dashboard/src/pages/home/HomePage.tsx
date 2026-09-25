import { ArrowLeftRight, ArrowRight, Boxes, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useDashboardStats, useKpiCount } from '@/features/home/api';
import { DailyStatsCard } from '@/features/home/DailyStatsCard';
import {
  kpiCards,
  statsCount,
  statsMoney,
  type DashboardStats,
  type KpiCard,
} from '@/features/home/kpi';
import { errorMessage } from '@/shared/lib/error-message';
import { roleLabel } from '@/shared/lib/labels';
import { toneClasses } from '@/shared/lib/status-tone';
import { MoneyText } from '@/shared/ui';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Bosh sahifa (D-041): rolga mos ko'rsatkichlar va tezkor amallar.
 *
 * Sonlar BITTA so'rovdan — `GET /admin/dashboard/stats` (api B-063).
 * Ikki kartochka ataylab eski yo'lda: menejerning shaxsiy ro'yxati va
 * ta'minot buyurtmalari — ular statistikada yo'q (`kpi.ts` izohi).
 */
export default function HomePage() {
  const profile = useProfile().data;
  const cards = kpiCards(profile ? { id: profile.id, role: profile.role } : undefined);
  const stats = useDashboardStats();
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
          <KpiTile key={card.id} card={card} stats={stats} />
        ))}
      </section>

      {/* T-010: kunlar bo'yicha statistika — sana/soat davri va tezkor tugmalar */}
      <DailyStatsCard />

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
        Sonlar har daqiqada yangilanadi. Kartochkani bosing — ro‘yxat aynan shu filtr bilan
        ochiladi.
        {stats.data && (
          <>
            {' '}Zaxira raqamlari markaziy ombor bo‘yicha (filialga bog‘liq emas), «kam qoldi»
            chegarasi — {stats.data.stock.globalLowThreshold} paddon.
          </>
        )}
      </p>
    </div>
  );
}

function KpiTile({
  card,
  stats,
}: {
  card: KpiCard;
  stats: UseQueryResult<DashboardStats, Error>;
}) {
  // Statistikada bor kartochka — umumiy so'rovdan; qolgani o'z so'rovidan
  const fallback = useKpiCount(
    card.source.kind === 'stats' ? { kind: 'orders', query: {} } : card.source,
    card.source.kind !== 'stats',
  );
  const source = card.source.kind === 'stats' ? stats : fallback;
  const value =
    card.source.kind === 'stats'
      ? statsCount(stats.data, card.source.count)
      : fallback.data;
  const money =
    card.source.kind === 'stats' ? statsMoney(stats.data, card.source.money) : undefined;
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
        {source.isPending ? (
          <span
            className="inline-block h-8 w-12 animate-pulse rounded-sm bg-surface-muted align-middle"
            aria-label="Yuklanmoqda"
          />
        ) : source.error ? (
          <span className="text-sm font-normal text-danger" title={errorMessage(source.error)}>
            Olib bo‘lmadi
          </span>
        ) : (
          value
        )}
      </span>
      {/* G6: summa satr ustida formatlanadi */}
      {money !== undefined && !source.isPending && !source.error && (
        <MoneyText value={money} className="text-sm text-muted" />
      )}
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
