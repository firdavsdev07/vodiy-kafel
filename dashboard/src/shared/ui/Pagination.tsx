import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LIMIT_OPTIONS, pageRange } from '@/shared/lib/list-params';

/**
 * Sahifalash (D-008) — backend `total`/`totalPages` bilan. "Jami N ta",
 * sahifa tugmalari, sahifadagi qatorlar soni.
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  disabled?: boolean;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav
      aria-label="Sahifalar"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm"
    >
      <p className="text-muted tabular-nums">
        {total === 0 ? 'Natija yo‘q' : `${from}–${to} / jami ${total} ta`}
      </p>

      <div className="flex items-center gap-4">
        {onLimitChange && (
          <label className="flex items-center gap-2 text-muted">
            Sahifada
            <select
              value={limit}
              disabled={disabled}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 rounded-md border border-line-strong bg-surface px-2 text-fg"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {totalPages > 1 && (
          <ul className="flex items-center gap-1">
            <li>
              <button
                type="button"
                className={`${btn} hover:bg-surface-muted`}
                disabled={disabled || page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Oldingi sahifa"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
            </li>
            {pageRange(page, totalPages).map((item, i) =>
              item === '…' ? (
                <li key={`gap-${i}`} aria-hidden className="px-1 text-muted">
                  …
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    className={`${btn} ${item === page ? 'bg-accent font-medium text-accent-contrast' : 'hover:bg-surface-muted'}`}
                    disabled={disabled}
                    aria-current={item === page ? 'page' : undefined}
                    aria-label={`${item}-sahifa`}
                    onClick={() => item !== page && onPageChange(item)}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                className={`${btn} hover:bg-surface-muted`}
                disabled={disabled || page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label="Keyingi sahifa"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}
