import { zodResolver } from '@hookform/resolvers/zod';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage } from '@/shared/lib/error-message';
import { orderStatusActionLabel, orderStatusLabel } from '@/shared/lib/labels';
import type { OrderStatus } from '@/shared/lib/status-tone';
import { Button, Modal, TextareaField, toast } from '@/shared/ui';
import { statusActions, statusNoteSchema, toChangeStatusBody, type ChangeStatusBody, type StatusNoteValues } from './status';

/**
 * Holat o'zgartirish mutatsiyasi — sahifa o'zi chaqiradi: mijoz buyurtmasi
 * (`useChangeOrderStatus`) yoki ta'minot buyurtmasi
 * (`useChangeSupplyOrderStatus`, D-031). Tugmalar mantig'i bir xil.
 */
export type ChangeStatusMutation = UseMutationResult<{ orderNumber: string; status: OrderStatus }, Error, ChangeStatusBody>;

const FORM_ID = 'order-status-form';

/**
 * Holat tugmalari (D-026). 🔒 G8: tugmalar FAQAT `allowedNextStatuses` dan;
 * yakuniy holatda (bo'sh ro'yxat) tugma umuman chiqmaydi.
 */
export function OrderStatusActions({
  orderNumber,
  allowed,
  change,
}: {
  orderNumber: string;
  allowed: readonly OrderStatus[];
  change: ChangeStatusMutation;
}) {
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const { forward, canCancel } = statusActions(allowed);

  if (allowed.length === 0) {
    return <p className="text-sm text-muted">Yakuniy holat — o‘zgartirib bo‘lmaydi.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {forward.map((s) => (
          <Button key={s} variant="primary" size="sm" onClick={() => setTarget(s)}>
            {orderStatusActionLabel[s]}
          </Button>
        ))}
        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setTarget('CANCELLED')}>
            {orderStatusActionLabel.CANCELLED}
          </Button>
        )}
      </div>
      {target && (
        <ChangeStatusModal
          key={target}
          change={change}
          orderNumber={orderNumber}
          target={target}
          onClose={() => {
            change.reset();
            setTarget(null);
          }}
        />
      )}
    </>
  );
}

function ChangeStatusModal({
  change,
  orderNumber,
  target,
  onClose,
}: {
  change: ChangeStatusMutation;
  orderNumber: string;
  target: OrderStatus;
  onClose: () => void;
}) {
  const cancel = target === 'CANCELLED';
  const form = useForm<StatusNoteValues>({
    resolver: zodResolver(statusNoteSchema(target)),
    defaultValues: { note: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (change.isPending) return;
    change.mutate(toChangeStatusBody(target, values), {
      onSuccess: (res) => {
        toast.success(`${res.orderNumber}: ${orderStatusLabel[res.status]}`);
        onClose();
      },
      onError: (e) => form.setError('root', { message: errorMessage(e) }),
    });
  });

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!change.isPending}
      size="sm"
      title={cancel ? `${orderNumber} ni bekor qilish?` : `${orderNumber}: “${orderStatusLabel[target]}”`}
      description={
        cancel
          ? 'Buyurtma yakuniy bekor qilinadi, orqaga qaytarib bo‘lmaydi. Kutilayotgan to‘lov bekor bo‘ladi, yozilgan qarz qaytariladi. Buyurtmachiga bildirishnoma boradi.'
          : 'Holat o‘zgarishi buyurtmachiga bildirishnoma bo‘lib boradi va orqaga qaytarilmaydi.'
      }
      footer={
        <>
          {/* Xavfli amalda Enter tasodifan tasdiqlamasin — fokus "Bekor qilish" da */}
          <Button onClick={onClose} disabled={change.isPending} data-autofocus>
            Yopish
          </Button>
          <Button variant={cancel ? 'danger' : 'primary'} type="submit" form={FORM_ID} pending={change.isPending}>
            {cancel ? 'Bekor qilish' : 'Tasdiqlash'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextareaField
          control={form.control}
          name="note"
          label={cancel ? 'Sabab' : 'Izoh (ixtiyoriy)'}
          required={cancel}
          maxLength={500}
          hint="⚠ Buyurtmachi holatlar tarixida ko‘radi"
        />
        {form.formState.errors.root && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
