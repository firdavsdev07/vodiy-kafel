import { Check, LoaderCircle, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { toast } from '@/shared/ui';
import { useUpsertStock } from './api';
import { palletDelta, parsePallets, toStockBody, type StockRow } from './stock';

/**
 * Paddon soni — jadvalda doim maydon (D-018). Yozuvchi (SUPER_ADMIN,
 * MODERATOR) o'zgartirsa ✓/✕ chiqadi: Enter saqlaydi, Esc qaytaradi.
 * Boshqalarga maydon `disabled`, sababi `reasonId` orqali o'qiladi.
 */
export function PalletsCell({ row, canEdit, reasonId }: { row: StockRow; canEdit: boolean; reasonId: string }) {
  const upsert = useUpsertStock();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const editing = draft !== null && draft !== String(row.stockPallets);

  const cancel = () => {
    setDraft(null);
    setError(null);
  };

  const save = () => {
    if (!editing || upsert.isPending || draft === null) return;
    const parsed = parsePallets(draft);
    if ('error' in parsed) return setError(parsed.error);
    upsert.mutate(toStockBody(row, { stockPallets: parsed.value }), {
      onSuccess: () => {
        toast.success(`${row.product.name}: ${row.stockPallets} → ${parsed.value} paddon (${palletDelta(row.stockPallets, parsed.value)})`);
        cancel();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          inputMode="numeric"
          value={draft ?? String(row.stockPallets)}
          disabled={!canEdit || upsert.isPending}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          aria-label={`${row.product.name} — ombordagi paddonlar soni`}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, !canEdit ? reasonId : null].filter(Boolean).join(' ') || undefined}
          title={canEdit ? undefined : 'Zaxira markaziy omborda boshqariladi'}
          className={`h-8 w-24 rounded-md border bg-surface px-2 text-right text-sm tabular-nums disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${
            error ? 'border-danger' : editing ? 'border-accent' : 'border-line-strong'
          }`}
        />
        {editing && (
          <>
            <button type="button" onClick={save} disabled={upsert.isPending} aria-label="Saqlash" className="inline-flex size-8 items-center justify-center rounded-md text-success hover:bg-success-soft">
              {upsert.isPending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}
            </button>
            <button type="button" onClick={cancel} disabled={upsert.isPending} aria-label="Bekor qilish" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-fg">
              <X size={15} aria-hidden />
            </button>
          </>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
