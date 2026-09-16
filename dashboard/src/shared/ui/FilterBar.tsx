import { Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';

export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Filtr paneli (D-008). Qiymatlar URL'da — `useListParams` bilan ishlatiladi:
 *
 *   <FilterBar search={list.params.filters.search} onSearchChange={(v) => list.setFilter('search', v)}
 *              hasFilters={list.hasFilters} onReset={list.resetFilters}>
 *     <FilterSelect label="Holat" value={...} onChange={...} options={...} />
 *   </FilterBar>
 *
 * Qidiruv debounce bilan: har harf so'rov yubormaydi.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Qidirish…',
  hasFilters,
  onReset,
  children,
  actions,
}: {
  search?: string;
  onSearchChange?: (value: string | undefined) => void;
  searchPlaceholder?: string;
  hasFilters: boolean;
  onReset: () => void;
  children?: ReactNode;
  /** O'ng tomonda: "Yangi qo'shish" va h.k. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
      {onSearchChange && (
        <SearchInput value={search ?? ''} onChange={onSearchChange} placeholder={searchPlaceholder} />
      )}
      {children}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X size={14} aria-hidden />
          Tozalash
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);

  // Tashqaridan o'zgarsa (Tozalash, orqaga tugmasi) — input ham yangilanadi
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === value) return;
    const timer = setTimeout(() => onChange(trimmed || undefined), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <label className="relative flex min-w-56 flex-1 sm:max-w-80">
      <span className="sr-only">{placeholder}</span>
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className="h-9 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-muted/70"
      />
    </label>
  );
}

/** Filtr uchun select: bo'sh qiymat — "Hammasi". */
export function FilterSelect<V extends string>({
  label,
  value,
  onChange,
  options,
  allLabel = 'Hammasi',
  loading = false,
}: {
  label: string;
  value: V | undefined;
  onChange: (value: V | undefined) => void;
  options: readonly { value: V; label: string }[];
  allLabel?: string;
  /** Variantlar serverdan kelmoqda — URL'dagi qiymat "Hammasi" bo'lib ko'rinib qolmasin */
  loading?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        value={value ?? ''}
        disabled={loading}
        aria-busy={loading || undefined}
        onChange={(e) => onChange((e.target.value || undefined) as V | undefined)}
        className="h-9 min-w-40 disabled:opacity-60 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
      >
        <option value="">{loading ? 'Yuklanmoqda…' : allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
