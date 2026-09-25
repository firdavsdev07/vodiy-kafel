import { useState, type KeyboardEvent } from 'react';
import { formatDayLong, formatDayShort } from './daily-range';

export interface ChartPoint {
  date: string;
  value: number;
  /** Tooltip va o'qdagi qiymat matni (so'm yoki dona). */
  label: string;
}

const HEIGHT = 220;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PAD_LEFT = 8;
const MAX_TICKS = 8;

/**
 * Kunlik ustunli chart (T-010). Kutubxonasiz SVG — bitta chart uchun
 * og'ir kutubxona olib kelinmadi.
 *
 * "Qaysi kun ekanini aniq tushunsin": ustun ustiga olib borilganda (yoki
 * fokusda ←/→) to'liq sana + hafta kuni + qiymat; o'qda sana yozuvlari.
 * Qiymatlar — backend hisoblagan sonlar, bu yerda faqat chiziladi.
 */
export function DailyChart({ points, emptyText }: { points: readonly ChartPoint[]; emptyText: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...points.map((p) => p.value));
  const count = points.length;

  if (count === 0) return <p className="py-10 text-center text-sm text-muted">{emptyText}</p>;

  // viewBox kengligi — kun soniga qarab, lekin ekranga sig'adi (preserveAspectRatio)
  const width = Math.max(320, count * 14);
  const plotW = width - PAD_LEFT * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / count;
  const barW = Math.max(1, Math.min(28, slot * 0.7));
  const step = Math.max(1, Math.ceil(count / MAX_TICKS));
  const current = active !== null ? points[active] : null;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setActive((i) => {
      if (e.key === 'Home') return 0;
      if (e.key === 'End') return count - 1;
      const base = i ?? (e.key === 'ArrowLeft' ? count : -1);
      return Math.min(count - 1, Math.max(0, base + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Tanlangan kun — tooltip o'rnida doimiy qator: sakramaydi, telefonda ham ko'rinadi */}
      <p aria-live="polite" className="min-h-5 text-sm">
        {current ? (
          <>
            <span className="font-medium">{formatDayLong(current.date)}</span>
            <span className="text-muted"> — </span>
            <span className="font-semibold tabular-nums">{current.label}</span>
          </>
        ) : (
          <span className="text-xs text-muted">Kun ustiga olib boring yoki bosing (klaviatura: ← →)</span>
        )}
      </p>
      <div
        role="img"
        tabIndex={0}
        aria-label={`Kunlik chart, ${count} kun. Strelkalar bilan kunlarni tanlang.`}
        onKeyDown={onKey}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className="rounded-md focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} preserveAspectRatio="none" className="h-56 w-full" aria-hidden>
          {/* Asos chizig'i */}
          <line x1={PAD_LEFT} x2={width - PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} className="stroke-line" />
          {points.map((p, i) => {
            const h = max > 0 ? (p.value / max) * plotH : 0;
            const x = PAD_LEFT + i * slot + (slot - barW) / 2;
            const isActive = i === active;
            return (
              <g key={p.date} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}>
                {/* Sichqoncha uchun butun ustun balandligidagi shaffof maydon */}
                <rect x={PAD_LEFT + i * slot} y={PAD_TOP} width={slot} height={plotH} fill="transparent" />
                <rect
                  x={x}
                  y={HEIGHT - PAD_BOTTOM - Math.max(h, p.value > 0 ? 2 : 0)}
                  width={barW}
                  height={Math.max(h, p.value > 0 ? 2 : 0)}
                  rx={Math.min(3, barW / 2)}
                  className={isActive ? 'fill-fg' : 'fill-accent'}
                  opacity={active === null || isActive ? 1 : 0.45}
                />
              </g>
            );
          })}
        </svg>
        {/* Sana yozuvlari — SVG tashqarisida: cho'zilmaydi, o'qiladi */}
        <div className="relative h-5 text-[11px] text-muted">
          {points.map((p, i) =>
            i % step === 0 || (i === count - 1 && (count - 1) % step >= step / 2) ? (
              <span
                key={p.date}
                className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums"
                style={{ left: `${((PAD_LEFT + i * slot + slot / 2) / width) * 100}%` }}
              >
                {formatDayShort(p.date)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
