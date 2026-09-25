import { Truck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useBranches } from '@/features/branches/api';
import { usePublicRegions, usePublicTransportTypes } from '@/features/supply-orders/api';
import type { Schema } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, toast } from '@/shared/ui';
import { useSetOrderDelivery } from './api';

type Order = Pick<
  Schema<'AdminOrderDetailDto'>,
  'id' | 'status' | 'payments' | 'delivery' | 'deliveryRequested' | 'dispatchBranch'
>;

const selectClass = 'h-9 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg';

/**
 * Yetkazib berishni belgilash (T-004) — MODERATOR / SUPER_ADMIN.
 *
 * Mijoz faqat "yetkazib bering" deydi; bu yerda jo'natiladigan markaziy
 * ombor, viloyat va transport tanlanadi. 🔒 Yo'l kira FRONTENDDA
 * HISOBLANMAYDI — saqlangach backend qaytargan summa ko'rsatiladi (G1).
 */
export function SetDeliveryForm({ order }: { order: Order }) {
  const [editing, setEditing] = useState(order.deliveryRequested && !order.delivery);
  const branches = useBranches(editing);
  const regions = usePublicRegions(editing);
  const transports = usePublicTransportTypes(editing);
  const save = useSetOrderDelivery(order.id);

  const [dispatchBranchId, setDispatchBranchId] = useState(order.dispatchBranch?.id ?? '');
  const [regionId, setRegionId] = useState('');
  const [transportTypeId, setTransportTypeId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const centrals = (branches.data ?? []).filter((b) => b.type === 'CENTRAL' && b.isActive);
  const pickup = regionId === '' && transportTypeId === '';
  const halfFilled = (regionId === '') !== (transportTypeId === '');

  if (!editing) {
    return (
      <div className="mt-3 border-t border-line pt-3">
        <Button size="sm" onClick={() => setEditing(true)}>
          <Truck size={14} aria-hidden />
          Yetkazib berishni o‘zgartirish
        </Button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (halfFilled) {
      setError('Viloyat va transport turi birga tanlanadi. Ikkalasi bo‘sh — olib ketish.');
      return;
    }
    save.mutate(
      {
        dispatchBranchId: dispatchBranchId || null,
        regionId: pickup ? null : regionId,
        transportTypeId: pickup ? null : transportTypeId,
      },
      {
        onSuccess: () => {
          toast.success(pickup ? 'Olib ketish belgilandi' : 'Yetkazib berish va yo‘l kira belgilandi');
          setEditing(false);
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <p className="text-sm font-medium">Yetkazib berishni belgilash</p>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Jo‘natish joyi (ombor)
        <select
          value={dispatchBranchId}
          onChange={(e) => setDispatchBranchId(e.target.value)}
          disabled={branches.isPending}
          className={selectClass}
        >
          <option value="">Belgilanmagan</option>
          {centrals.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Viloyat
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            disabled={regions.isPending}
            className={selectClass}
          >
            <option value="">Olib ketish</option>
            {(regions.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Transport turi
          <select
            value={transportTypeId}
            onChange={(e) => setTransportTypeId(e.target.value)}
            disabled={transports.isPending}
            className={selectClass}
          >
            <option value="">Tanlanmagan</option>
            {(transports.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.capacityPallets} paddon
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted">
        Yo‘l kira filial tarifi va mijozning shaxsiy shartlari bo‘yicha hisoblanadi; buyurtma summasi,
        kutilayotgan to‘lov va mijoz balansi birga yangilanadi.
      </p>
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm" pending={save.isPending}>
          Saqlash
        </Button>
        {!(order.deliveryRequested && !order.delivery) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Bekor qilish
          </Button>
        )}
      </div>
    </form>
  );
}
