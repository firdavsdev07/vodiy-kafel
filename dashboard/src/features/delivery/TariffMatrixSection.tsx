import { AlertTriangle, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney, formatMoneyInput, normalizeDecimal, parseMoneyInput } from '@/shared/lib/format';
import { Badge, Button, ErrorState, MoneyText, PageLoading, toast } from '@/shared/ui';
import { useBranchTariffMatrix, useRegionList, useSaveTariffs, useTransportTypeList } from './api';
import { buildMatrix, cellKey, draftToUpserts } from './tariffs';

/**
 * Tarif matritsasi (D-039): qator — viloyat, ustun — transport turi, katak —
 * bitta transport uchun yo'l kira. Yetkazib berish narxi = filial × viloyat ×
 * transport (api/CLAUDE.md) — yagona tarif EMAS.
 *
 * 🔒 SUPER_ADMIN filialni tanlaydi; BRANCH_ADMIN — faqat o'z filiali (tokendan,
 *    tanlov yo'q). Tahrirlash — `tariffs.write`; boshqalar faqat ko'radi.
 * ⚠ Bo'sh katak = shu yo'nalishda yo'l kira hisoblanmaydi — ajratib ko'rsatiladi.
 */
export function TariffMatrixSection() {
  const profile = useProfile().data;
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const canWrite = useCan('tariffs.write');
  const branches = useBranches(isSuperAdmin);
  const [pickedBranch, setPickedBranch] = useState('');
  const branchId = isSuperAdmin ? pickedBranch || (branches.data?.find((b) => b.isActive)?.id ?? '') : null;

  const regions = useRegionList('true');
  const types = useTransportTypeList('true');
  const tariffs = useBranchTariffMatrix(branchId, !isSuperAdmin || Boolean(branchId));
  const save = useSaveTariffs();

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());

  const loading = regions.isPending || types.isPending || tariffs.isPending || (isSuperAdmin && branches.isPending);
  const failed = regions.error ?? types.error ?? tariffs.error;

  const stopEditing = () => {
    setEditing(false);
    setDrafts(new Map());
    setErrors(new Map());
    save.reset();
  };

  // Yuklanayotganda bo'sh matritsa — pastda ko'rsatilmaydi
  const matrix = buildMatrix(regions.data ?? [], types.data ?? [], tariffs.data ?? []);

  const submit = () => {
    if (save.isPending) return;
    const result = draftToUpserts(drafts, matrix, branchId);
    if (!result.ok) return setErrors(result.errors);
    setErrors(new Map());
    if (result.upserts.length === 0) return stopEditing();
    save.mutate(result.upserts, {
      onSuccess: () => {
        toast.success(`${result.upserts.length} ta tarif saqlandi`);
        stopEditing();
      },
    });
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4">
      <div className="flex flex-wrap items-end gap-3">
        {isSuperAdmin && (
          <label className="flex flex-col gap-1 text-xs text-muted">
            Filial
            <select
              value={branchId ?? ''}
              disabled={editing || branches.isPending}
              onChange={(e) => setPickedBranch(e.target.value)}
              className="h-9 min-w-56 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg disabled:opacity-60"
            >
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.isActive ? '' : ' (yopilgan)'}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="pb-2 text-sm text-muted">Narx — bitta transport uchun yo‘l kira, so‘m.</p>
      </div>
      {canWrite &&
        (editing ? (
          <div className="flex gap-2">
            <Button onClick={stopEditing} disabled={save.isPending}>
              Bekor qilish
            </Button>
            <Button variant="primary" pending={save.isPending} onClick={() => submit()}>
              Saqlash
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} disabled={loading || Boolean(failed)}>
            <Pencil size={14} aria-hidden />
            Tahrirlash
          </Button>
        ))}
    </div>
  );

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {header}
        <PageLoading />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {header}
        <ErrorState
          error={failed}
          onRetry={() => {
            void regions.refetch();
            void types.refetch();
            void tariffs.refetch();
          }}
        />
      </div>
    );
  }

  const draftValue = (key: string, current: string | undefined) => drafts.get(key) ?? (current ? normalizeDecimal(current) : '');

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {header}

      {matrix.missing > 0 && (
        <p role="status" className="flex items-center gap-2 border-b border-line bg-warning-soft px-4 py-2 text-sm text-warning">
          <AlertTriangle size={15} aria-hidden />
          {matrix.missing} ta yo‘nalishda faol tarif yo‘q — u yerga yetkazib berishni hisoblab bo‘lmaydi.
        </p>
      )}
      {save.error && (
        <p role="alert" className="border-b border-line bg-danger-soft px-4 py-2 text-sm whitespace-pre-line text-danger">
          {errorMessage(save.error)}
        </p>
      )}

      {matrix.rows.length === 0 || matrix.columns.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Avval faol viloyat va transport turi qo‘shing.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Tarif matritsasi: viloyat × transport turi</caption>
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="sticky left-0 bg-surface px-4 py-2 text-left font-medium">Viloyat</th>
                {matrix.columns.map((c) => (
                  <th key={c.id} scope="col" className="px-4 py-2 text-right font-medium whitespace-nowrap">
                    {c.name} <span className="font-normal">· {c.capacityPallets} paddon</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <th scope="row" className="sticky left-0 bg-surface px-4 py-2 text-left font-medium whitespace-nowrap">
                    {r.name}
                  </th>
                  {matrix.columns.map((c) => {
                    const key = cellKey(r.id, c.id);
                    const tariff = matrix.cells.get(key);
                    const error = errors.get(key);
                    const empty = !tariff?.isActive;
                    if (editing) {
                      return (
                        <td key={key} className="px-2 py-1.5 text-right align-top">
                          <input
                            aria-label={`${r.name}, ${c.name} — yo‘l kira`}
                            aria-invalid={Boolean(error) || undefined}
                            inputMode="decimal"
                            value={formatMoneyInput(draftValue(key, tariff?.price))}
                            placeholder="—"
                            onChange={(e) => setDrafts((d) => new Map(d).set(key, parseMoneyInput(e.target.value)))}
                            className={`h-8 w-36 rounded-md border bg-surface px-2 text-right tabular-nums ${error ? 'border-danger' : tariff ? 'border-line-strong' : 'border-warning'}`}
                          />
                          {error && <p className="mt-0.5 text-xs text-danger">{error}</p>}
                        </td>
                      );
                    }
                    return (
                      <td key={key} className={`px-4 py-2 text-right ${empty ? 'bg-warning-soft/40' : ''}`}>
                        {tariff ? (
                          <span className="inline-flex items-center gap-2">
                            {!tariff.isActive && <Badge tone="neutral">Nofaol</Badge>}
                            <MoneyText value={tariff.price} currency={false} className={tariff.isActive ? '' : 'text-muted'} />
                          </span>
                        ) : (
                          <span className="text-warning" title="Tarif yo‘q">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          Faqat o‘zgartirilgan kataklar saqlanadi. Mavjud tarifni o‘chirib bo‘lmaydi. Masalan: {formatMoney('4000000')}.
        </p>
      )}
    </div>
  );
}
