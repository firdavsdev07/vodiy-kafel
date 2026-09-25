import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { Schema } from '@/shared/api';
import { formatMoney } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui';
import { useDailyStats } from './api';
import { DailyChart, type ChartPoint } from './DailyChart';
import {
  formatPeriod,
  QUICK_RANGES,
  quickRange,
  rangeError,
  toIso,
  type DayRange,
  type QuickRangeId,
} from './daily-range';

type Values = Schema<'DailyStatsValuesDto'>;

/** Qaysi ko'rsatkich chizilsin — hammasi bir o'qda bo'lmaydi (so'm va dona aralashmasin). */
const METRICS = [
  { id: 'ordersCount', label: 'Buyurtmalar', money: false },
  { id: 'ordersTotal', label: 'Buyurtma summasi', money: true },
  { id: 'paymentsTotal', label: 'Tushgan to‘lovlar', money: true },
  { id: 'newCustomers', label: 'Yangi mijozlar', money: false },
  { id: 'deliveredCount', label: 'Yetkazilgan', money: false },
  { id: 'cancelledCount', label: 'Bekor qilingan', money: false },
] as const satisfies readonly { id: keyof Values; label: string; money: boolean }[];

type MetricId = (typeof METRICS)[number]['id'];

const valueLabel = (values: Values, metric: (typeof METRICS)[number]) =>
  metric.money ? formatMoney(String(values[metric.id])) : `${values[metric.id]} ta`;

const inputClass = 'h-9 rounded-md border border-line-strong bg-surface px-2 text-sm tabular-nums';

/**
 * Kunlik statistika (T-010): sana + soat bilan davr, tezkor tugmalar,
 * ko'rsatkich tanlash va chart. ⚠ Tezkor tugma kalendar/soat maydonlarini
 * to'ldiradi; maydon qo'lda o'zgarsa tugma belgisi olib tashlanadi — ikkalasi
 * hech qachon bir-biriga zid ko'rinmaydi.
 */
export function DailyStatsCard() {
  const [quick, setQuick] = useState<QuickRangeId | null>('7d');
  const [range, setRange] = useState<DayRange>(() => quickRange('7d', new Date()));
  const [metricId, setMetricId] = useState<MetricId>('ordersCount');

  const error = rangeError(range);
  const stats = useDailyStats(
    error ? null : { from: toIso(range.fromDate, range.fromTime), to: toIso(range.toDate, range.toTime) },
  );
  const metric = METRICS.find((m) => m.id === metricId)!;

  const edit = (patch: Partial<DayRange>) => {
    setQuick(null);
    setRange((r) => ({ ...r, ...patch }));
  };

  const points: ChartPoint[] = (stats.data?.days ?? []).map((day) => ({
    date: day.date,
    value: Number(day[metric.id]),
    label: valueLabel(day, metric),
  }));

  return (
    <section aria-label="Kunlik statistika" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <BarChart3 size={16} aria-hidden />
        <h2 className="text-sm font-medium">Kunlik statistika</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-xs text-muted">Dan</legend>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Boshlanish sanasi"
                value={range.fromDate}
                max={range.toDate}
                onChange={(e) => edit({ fromDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="time"
                aria-label="Boshlanish soati"
                value={range.fromTime}
                onChange={(e) => edit({ fromTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-xs text-muted">Gacha</legend>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Tugash sanasi"
                value={range.toDate}
                min={range.fromDate}
                onChange={(e) => edit({ toDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="time"
                aria-label="Tugash soati"
                value={range.toTime}
                onChange={(e) => edit({ toTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>

        <div role="group" aria-label="Tezkor davr" className="flex flex-wrap gap-1.5">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={quick === r.id}
              onClick={() => {
                setQuick(r.id);
                setRange(quickRange(r.id, new Date()));
              }}
              className={`h-8 rounded-md border px-2.5 text-xs font-medium ${
                quick === r.id
                  ? 'border-fg bg-fg text-bg'
                  : 'border-line-strong bg-surface text-muted hover:text-fg'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          {error}
        </p>
      ) : (
        <p className="text-sm">
          <span className="text-muted">Davr: </span>
          <span className="font-medium">{formatPeriod(range)}</span>
          <span className="text-xs text-muted"> (Toshkent vaqti)</span>
        </p>
      )}

      <div role="tablist" aria-label="Ko‘rsatkich" className="flex flex-wrap gap-1 border-b border-line">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={metricId === m.id}
            onClick={() => setMetricId(m.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              metricId === m.id ? 'border-fg font-medium text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {stats.error ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} compact />
      ) : !stats.data ? (
        <div aria-hidden className="h-64 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <div aria-busy={stats.isFetching || undefined} className={stats.isPlaceholderData ? 'opacity-60' : ''}>
          <DailyChart points={points} emptyText="Bu davrda kun yo‘q" />
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {METRICS.map((m) => (
              <div key={m.id}>
                <dt className="text-xs text-muted">{m.label}</dt>
                <dd className={`tabular-nums ${m.id === metricId ? 'font-semibold' : ''}`}>
                  {valueLabel(stats.data.totals, m)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
