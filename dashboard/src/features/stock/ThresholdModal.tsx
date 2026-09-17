import { useState } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, Modal, toast } from '@/shared/ui';
import { useUpsertStock } from './api';
import { parsePallets, toStockBody, type StockRow } from './stock';

/** «Kam qoldi» chegarasi (D-018): global sozlama yoki mahsulotning o'zi. */
export function ThresholdModal({ row, onClose }: { row: StockRow | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(row)} onClose={onClose} size="sm" title="«Kam qoldi» chegarasi" description={row?.product.name}>
      {row && <ThresholdForm key={row.product.id} row={row} onClose={onClose} />}
    </Modal>
  );
}

function ThresholdForm({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const upsert = useUpsertStock();
  const [mode, setMode] = useState<'global' | 'own'>(row.lowStockThreshold == null ? 'global' : 'own');
  const [value, setValue] = useState(String(row.lowStockThreshold ?? row.effectiveThreshold));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    let threshold: number | 'global' = 'global';
    if (mode === 'own') {
      const parsed = parsePallets(value);
      if ('error' in parsed) return setError(parsed.error);
      threshold = parsed.value;
    }
    upsert.mutate(toStockBody(row, { threshold }), {
      onSuccess: () => {
        toast.success('Chegara saqlandi');
        onClose();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Paddonlar soni shu chegaraga teng yoki kam bo‘lsa — holat “Kam qoldi”. Hozir amalda:{' '}
        <strong className="text-fg tabular-nums">{row.effectiveThreshold}</strong>.
      </p>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="sr-only">Chegara turi</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="threshold" checked={mode === 'global'} onChange={() => setMode('global')} className="accent-accent" />
          Global sozlama (Sozlamalar → zaxira)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="threshold" checked={mode === 'own'} onChange={() => setMode('own')} className="accent-accent" />
          Shu mahsulot uchun:
          <input
            inputMode="numeric"
            value={value}
            disabled={mode !== 'own'}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-label="Chegara, paddon"
            className="h-8 w-20 rounded-md border border-line-strong bg-surface px-2 text-right tabular-nums disabled:opacity-50"
          />
          paddon
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={upsert.isPending}>
          Bekor qilish
        </Button>
        <Button variant="primary" onClick={save} pending={upsert.isPending}>
          Saqlash
        </Button>
      </div>
    </div>
  );
}
