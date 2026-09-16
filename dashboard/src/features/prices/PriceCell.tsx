import { Check, LoaderCircle, Pencil, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney, formatMoneyInput, normalizeDecimal, parseMoneyInput } from '@/shared/lib/format';
import { MoneyText, toast } from '@/shared/ui';
import { useUpdatePrice } from './api';
import { validatePrice, type BranchPrice } from './prices';

/**
 * Narxni jadvalning o'zida tahrirlash (D-016). Enter — saqlash, Esc —
 * bekor. Narx SATR sifatida ketadi (G6). Xato qator ostida qoladi, tahrir
 * yopilmaydi — xodim tuzatib qayta yuboradi.
 */
export function PriceCell({ row, canEdit }: { row: BranchPrice; canEdit: boolean }) {
  const update = useUpdatePrice();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  if (!editing) {
    return (
      <span className="inline-flex items-center justify-end gap-1">
        <MoneyText value={row.pricePerSqm} className={row.isActive ? '' : 'text-muted'} />
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setValue(normalizeDecimal(row.pricePerSqm));
              setError(null);
              setEditing(true);
            }}
            aria-label={`${row.product.name} — narxni o‘zgartirish`}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-fg"
          >
            <Pencil size={13} aria-hidden />
          </button>
        )}
      </span>
    );
  }

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const submit = () => {
    if (update.isPending) return;
    const problem = validatePrice(value);
    if (problem) return setError(problem);
    if (normalizeDecimal(value) === normalizeDecimal(row.pricePerSqm)) return cancel();
    update.mutate(
      { id: row.id, pricePerSqm: value },
      {
        onSuccess: () => {
          toast.success(
            `${row.product.name}: ${formatMoney(row.pricePerSqm)} → ${formatMoney(value)} (m²)`,
          );
          cancel();
        },
        // 🔒 begona filial yozuvi — 404 "Topilmadi" (ruxsat yo'q demaydi)
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <div
          className={`flex h-8 w-40 items-center rounded-md border bg-surface focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus ${
            error ? 'border-danger' : 'border-line-strong'
          }`}
        >
          <input
            autoFocus
            inputMode="decimal"
            aria-label={`${row.product.name} — yangi narx, so‘m/m²`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            value={formatMoneyInput(value)}
            onChange={(e) => {
              setValue(parseMoneyInput(e.target.value));
              setError(null);
            }}
            onKeyDown={onKeyDown}
            disabled={update.isPending}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-right text-sm tabular-nums outline-none"
          />
          <span className="pr-2 text-xs text-muted select-none">so‘m</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={update.isPending}
          aria-label="Saqlash"
          className="inline-flex size-8 items-center justify-center rounded-md text-success hover:bg-success-soft disabled:opacity-50"
        >
          {update.isPending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={update.isPending}
          aria-label="Bekor qilish"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-fg"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="max-w-64 text-right text-xs whitespace-pre-line text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
