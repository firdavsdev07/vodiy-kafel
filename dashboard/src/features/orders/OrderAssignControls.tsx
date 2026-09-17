import { Zap } from 'lucide-react';
import { useState } from 'react';
import { useProfile } from '@/features/auth/hooks';
import { errorMessage } from '@/shared/lib/error-message';
import { can } from '@/shared/lib/permissions';
import { Button, Modal, toast } from '@/shared/ui';
import { controlClass } from '@/shared/ui/form/control-class';
import { useAssignOrder, useManagerOptions, useSetOrderUrgent } from './api';
import { assignOptions } from './assign';

type OrderRef = {
  id: string;
  orderNumber: string;
  isUrgent: boolean;
  branch?: { id: string; name: string } | null;
  manager?: { id: string; fullName: string } | null;
};

/**
 * "Tezkor" belgisini yoqish/o'chirish (D-027) — barcha xodim. Tasdiqsiz:
 * qaytariladigan, bildirishnoma yubormaydigan amal.
 * `compact` — jadval qatori uchun (faqat ikonka).
 */
export function UrgentToggle({ order, compact = false }: { order: OrderRef; compact?: boolean }) {
  const setUrgent = useSetOrderUrgent(order.id);
  const next = !order.isUrgent;
  const label = order.isUrgent ? 'Tezkor belgisini olib tashlash' : 'Tezkor deb belgilash';

  const toggle = () =>
    setUrgent.mutate(next, {
      onSuccess: () => toast.success(`${order.orderNumber}: ${next ? 'tezkor deb belgilandi' : 'tezkor belgisi olindi'}`),
      onError: (e) => toast.error(e),
    });

  if (compact) {
    return (
      <button
        type="button"
        aria-label={`${order.orderNumber} — ${label}`}
        aria-pressed={order.isUrgent}
        title={label}
        disabled={setUrgent.isPending}
        onClick={toggle}
        className={`inline-flex size-8 items-center justify-center rounded-md disabled:opacity-50 ${
          order.isUrgent ? 'text-danger hover:bg-danger-soft' : 'text-muted hover:bg-surface-muted hover:text-fg'
        }`}
      >
        <Zap size={15} aria-hidden fill={order.isUrgent ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <Button size="sm" variant={order.isUrgent ? 'secondary' : 'ghost'} onClick={toggle} pending={setUrgent.isPending} aria-pressed={order.isUrgent}>
      <Zap size={14} aria-hidden fill={order.isUrgent ? 'currentColor' : 'none'} />
      {label}
    </Button>
  );
}

/**
 * Xodim biriktirish oynasi (D-027). 🔒 Faqat `orders.assign` ruxsati borga
 * ochiladi (chaqiruvchi tekshiradi). Nomzodlar — buyurtma FILIALIDAN.
 */
export function AssignManagerModal({ order, open, onClose }: { order: OrderRef; open: boolean; onClose: () => void }) {
  const profile = useProfile().data;
  const listManagers = can(profile?.role, 'managers.manage');
  const managers = useManagerOptions(open && listManagers && Boolean(order.branch), order.branch?.id);
  const assign = useAssignOrder(order.id);
  const [value, setValue] = useState(order.manager?.id ?? '');

  const options = assignOptions({
    role: profile?.role,
    me: profile,
    managers: managers.data,
    current: order.manager ?? null,
  });

  const close = () => {
    assign.reset();
    setValue(order.manager?.id ?? '');
    onClose();
  };

  const save = (managerId: string | null) => {
    if (assign.isPending) return;
    assign.mutate(managerId, {
      onSuccess: (res) => {
        toast.success(res.manager ? `${res.orderNumber}: ${res.manager.fullName} ga biriktirildi` : `${res.orderNumber}: biriktirish olib tashlandi`);
        close();
      },
    });
  };

  const unchanged = value === (order.manager?.id ?? '');

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!assign.isPending}
      size="sm"
      title={`${order.orderNumber} — mas’ul xodim`}
      description={order.branch ? `Faqat “${order.branch.name}” filialining faol xodimlari.` : undefined}
      footer={
        <>
          {order.manager && (
            <Button variant="ghost" onClick={() => save(null)} disabled={assign.isPending} className="mr-auto">
              Olib tashlash
            </Button>
          )}
          <Button onClick={close} disabled={assign.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" onClick={() => save(value)} pending={assign.isPending} disabled={!value || unchanged}>
            Biriktirish
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Xodim
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={managers.isFetching && options.length === 0}
            className={controlClass(false, 'h-9 px-2 font-normal')}
          >
            <option value="" disabled>
              {listManagers && managers.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {listManagers && managers.data?.length === 0 && (
          <p className="text-xs text-muted">Bu filialda faol menejer yo‘q.</p>
        )}
        {profile?.role === 'MODERATOR' && (
          <p className="text-xs text-muted">Moderator hozircha buyurtmani faqat o‘ziga biriktira oladi.</p>
        )}
        {assign.error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {errorMessage(assign.error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
