import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney } from '@/shared/lib/format';
import { Button, Modal, toast } from '@/shared/ui';
import { useBulkPriceUpdate } from './api';
import { applyBulk, validateBulkInput, type BulkMode } from './bulk-price';
import type { BranchPrice } from './prices';

type Step = 'input' | 'confirm' | 'running' | 'done';

interface Outcome {
  row: BranchPrice;
  newPrice?: string;
  error?: string;
}

const modes: { value: BulkMode; label: string; placeholder: string; hint: string }[] = [
  { value: 'percent', label: 'Foizga', placeholder: '10 yoki -5,5', hint: 'Musbat — oshirish, manfiy — kamaytirish' },
  { value: 'add', label: 'Summaga', placeholder: '+5000 yoki -2000', hint: 'Har bir narxga qo‘shiladi yoki ayiriladi (so‘m/m²)' },
  { value: 'set', label: 'Aniq narx', placeholder: '95000', hint: 'Hammasiga bir xil narx (so‘m/m²)' },
];

/**
 * Ommaviy narx o'zgarishi (D-017): qiymat → MAJBURIY tasdiq ekrani (nechta,
 * qaysi filial, eski → yangi) → ketma-ket yuborish (progress) → natija
 * (nechtasi o'zgardi, qaysilari xato va nega). Qaytarib bo'lmaydi.
 */
export function BulkPriceModal({
  open,
  rows,
  onClose,
  onFinished,
}: {
  open: boolean;
  rows: readonly BranchPrice[];
  onClose: () => void;
  onFinished: () => void;
}) {
  const bulk = useBulkPriceUpdate();
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<BulkMode>('percent');
  const [value, setValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [progress, setProgress] = useState(0);

  const preview = useMemo(
    () =>
      step === 'input'
        ? []
        : rows.map((row): Outcome => {
            const r = applyBulk(row.pricePerSqm, mode, value);
            return r.ok ? { row, newPrice: r.price } : { row, error: r.reason };
          }),
    [rows, mode, value, step],
  );
  const valid = preview.filter((p) => p.newPrice);
  const invalid = preview.filter((p) => p.error);
  const branches = [...new Set(rows.map((r) => r.branch.name))];

  const reset = () => {
    setStep('input');
    setValue('');
    setInputError(null);
    setOutcomes([]);
    setProgress(0);
  };
  const close = () => {
    if (step === 'running') return;
    if (step === 'done') onFinished();
    reset();
    onClose();
  };

  const next = () => {
    const problem = validateBulkInput(mode, value);
    if (problem) return setInputError(problem);
    setStep('confirm');
  };

  const run = async (targets: Outcome[]) => {
    setStep('running');
    setProgress(0);
    const results: Outcome[] = [];
    for (const [i, target] of targets.entries()) {
      try {
        await bulk.send({ id: target.row.id, pricePerSqm: target.newPrice ?? '' });
        results.push({ row: target.row, newPrice: target.newPrice });
      } catch (error) {
        results.push({ row: target.row, newPrice: target.newPrice, error: errorMessage(error) });
      }
      setProgress((i + 1) / targets.length);
    }
    void bulk.finish();
    setOutcomes([...results, ...invalid]);
    setStep('done');
    const ok = results.filter((r) => !r.error).length;
    if (ok) toast.success(`${ok} ta narx o‘zgartirildi`);
  };

  const done = outcomes.filter((o) => !o.error);
  const failed = outcomes.filter((o) => o.error);
  const retryable = failed.filter((o) => o.newPrice);
  const current = modes.find((m) => m.value === mode) ?? modes[0]!;

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={step !== 'running'}
      size="lg"
      title={
        step === 'confirm' ? 'Tasdiqlang: narxlar o‘zgaradi' : step === 'done' ? 'Natija' : `Narxni o‘zgartirish — ${rows.length} ta mahsulot`
      }
      footer={
        step === 'input' ? (
          <>
            <Button onClick={close}>Bekor qilish</Button>
            <Button variant="primary" onClick={next}>
              Davom etish
            </Button>
          </>
        ) : step === 'confirm' ? (
          <>
            <Button onClick={() => setStep('input')}>Orqaga</Button>
            <Button variant="danger" onClick={() => void run(valid)} disabled={valid.length === 0}>
              {valid.length} ta narxni o‘zgartirish
            </Button>
          </>
        ) : step === 'running' ? (
          <Button variant="primary" pending>
            Yuborilmoqda {Math.round(progress * 100)}%
          </Button>
        ) : (
          <>
            {retryable.length > 0 && <Button onClick={() => void run(retryable)}>Xatolarni qayta urinish ({retryable.length})</Button>}
            <Button variant="primary" onClick={close}>
              Yopish
            </Button>
          </>
        )
      }
    >
      {step === 'input' && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-sm font-medium">Qanday o‘zgaradi</legend>
            {modes.map((m) => (
              <label
                key={m.value}
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                  mode === m.value ? 'border-accent bg-surface-muted font-medium' : 'border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="bulk-mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => {
                    setMode(m.value);
                    setInputError(null);
                  }}
                  className="accent-accent"
                />
                {m.label}
              </label>
            ))}
          </fieldset>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
            Qiymat{mode === 'percent' ? ', %' : ', so‘m'}
            <input
              autoFocus
              inputMode="decimal"
              value={value}
              placeholder={current.placeholder}
              aria-invalid={inputError ? true : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && next()}
              className={`h-9 rounded-md border bg-surface px-3 text-right font-normal tabular-nums ${inputError ? 'border-danger' : 'border-line-strong'}`}
            />
            <span className={`text-xs font-normal ${inputError ? 'text-danger' : 'text-muted'}`}>{inputError ?? current.hint}</span>
          </label>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex flex-col gap-4">
          <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <strong>{valid.length} ta</strong> narx o‘zgaradi · filial: <strong>{branches.join(', ')}</strong>. Bu amalni
              qaytarib bo‘lmaydi — eski narxni qayta kiritish kerak bo‘ladi. Eski buyurtmalar o‘zgarmaydi.
            </span>
          </p>
          {invalid.length > 0 && (
            <p className="text-sm text-danger">
              {invalid.length} ta mahsulot o‘tkazib yuboriladi — yangi narx 0 yoki manfiy bo‘lib qoladi.
            </p>
          )}
          <PreviewTable items={preview} />
        </div>
      )}

      {step === 'running' && (
        <div className="flex flex-col gap-3 py-4">
          <p className="text-sm">Narxlar birma-bir yuborilmoqda — oynani yopmang.</p>
          <div role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="text-success" aria-hidden />
            O‘zgardi: <strong className="tabular-nums">{done.length}</strong>
            <span className="mx-2 text-line-strong">|</span>
            <CircleAlert size={16} className={failed.length ? 'text-danger' : 'text-muted'} aria-hidden />
            Xato: <strong className="tabular-nums">{failed.length}</strong>
          </p>
          {failed.length > 0 && <PreviewTable items={failed} showErrors />}
        </div>
      )}
    </Modal>
  );
}

function PreviewTable({ items, showErrors = false }: { items: readonly Outcome[]; showErrors?: boolean }) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-muted text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Mahsulot</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Eski</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Yangi</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ row, newPrice, error }) => (
            <tr key={row.id} className="border-t border-line">
              <td className="px-3 py-1.5">
                {row.product.name} <span className="text-xs text-muted">· {row.branch.name}</span>
                {(showErrors || !newPrice) && error && <p className="text-xs whitespace-pre-line text-danger">{error}</p>}
              </td>
              <td className="px-3 py-1.5 text-right whitespace-nowrap text-muted tabular-nums">{formatMoney(row.pricePerSqm)}</td>
              <td className="px-3 py-1.5 text-right font-medium whitespace-nowrap tabular-nums">{newPrice ? formatMoney(newPrice) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
