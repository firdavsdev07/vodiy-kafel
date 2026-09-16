import { Plus, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui';
import type { ProductRef } from './similar';
import { useProductSearch } from './similar-api';

/**
 * Mahsulotni qidirib tanlash (D-014, D-015): 2+ harf, debounce, 10 natija.
 * `unavailable` — nega tanlab bo'lmasligi ("shu mahsulot", "qo'shilgan"),
 * `null` — tanlash mumkin.
 */
export function ProductSearch({
  onPick,
  unavailable = () => null,
  disabled,
  placeholder = 'Mahsulot qidiring (2+ harf)…',
  pickLabel = 'Qo‘shish',
}: {
  onPick: (product: ProductRef) => void;
  unavailable?: (product: ProductRef) => string | null;
  /** Qidiruv o'chiq — sababi placeholder'da */
  disabled?: string;
  placeholder?: string;
  pickLabel?: string;
}) {
  const [text, setText] = useState('');
  const search = useDebouncedValue(text.trim());
  const results = useProductSearch(search);
  const listId = useId();
  const items = results.data?.items ?? [];
  const showList = search.length >= 2 && !disabled;

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex max-w-md">
        <span className="sr-only">Mahsulot qidirish</span>
        <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ?? placeholder}
          disabled={Boolean(disabled)}
          aria-controls={showList ? listId : undefined}
          className="h-9 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-muted/70 disabled:opacity-60"
        />
      </label>
      {showList && (
        <div id={listId} aria-live="polite" className="max-w-md rounded-md border border-line">
          {results.isPending ? (
            <p className="px-3 py-2 text-sm text-muted">Qidirilmoqda…</p>
          ) : results.error ? (
            <p className="px-3 py-2 text-sm text-danger">{errorMessage(results.error)}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Topilmadi</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((p) => {
                const ref: ProductRef = { id: p.id, name: p.name, slug: p.slug, isActive: p.isActive };
                const reason = unavailable(ref);
                return (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className={`min-w-0 flex-1 truncate ${p.isActive ? '' : 'text-muted'}`}>
                      {p.name}{' '}
                      <span className="text-xs text-muted">
                        · {p.factory.name} · {p.size.label}
                      </span>
                    </span>
                    {reason ? (
                      <span className="text-xs text-muted">{reason}</span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onPick(ref)}>
                        <Plus size={14} aria-hidden />
                        {pickLabel}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
