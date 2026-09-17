import { useState } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney } from '@/shared/lib/format';
import { paymentMethodLabel } from '@/shared/lib/labels';
import { Button, Modal, toast } from '@/shared/ui';
import { controlClass } from '@/shared/ui/form/control-class';
import { useConfirmPayment } from './api';
import type { OrderPayment } from './detail';

/**
 * To'lovni tasdiqlash dialogi (D-029): summa, usul va xaridor ko'rsatiladi —
 * xodim pul haqiqatan tushganini solishtiradi. Qaytarib bo'lmaydi: xato
 * tasdiq faqat hisobda teskari tuzatish bilan to'g'rilanadi.
 */
export function ConfirmPaymentDialog({
  payment,
  orderNumber,
  buyerName,
  onClose,
}: {
  payment: OrderPayment;
  orderNumber: string;
  buyerName: string;
  onClose: () => void;
}) {
  const confirm = useConfirmPayment();
  const [note, setNote] = useState('');

  const submit = () => {
    if (confirm.isPending) return;
    confirm.mutate(
      { paymentId: payment.id, note: note.trim() || undefined },
      {
        onSuccess: (res) => {
          toast.success(`${res.orderNumber}: ${formatMoney(res.amount)} to‘lov tasdiqlandi`);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!confirm.isPending}
      size="sm"
      title="To‘lov tushganini tasdiqlaysizmi?"
      description="Tasdiqlangach to‘lov “To‘landi” bo‘ladi va mijoz hisobiga yoziladi. Orqaga qaytarilmaydi."
      footer={
        <>
          <Button onClick={onClose} disabled={confirm.isPending} data-autofocus>
            Bekor qilish
          </Button>
          <Button variant="primary" onClick={submit} pending={confirm.isPending}>
            Tasdiqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-line bg-surface-muted px-4 py-3 text-sm">
          <dt className="text-muted">Buyurtma</dt>
          <dd className="font-mono">{orderNumber}</dd>
          <dt className="text-muted">Xaridor</dt>
          <dd className="font-medium">{buyerName}</dd>
          <dt className="text-muted">Usul</dt>
          <dd>{paymentMethodLabel[payment.method]}</dd>
          <dt className="text-muted">Summa</dt>
          <dd className="text-base font-semibold tabular-nums">{formatMoney(payment.amount)}</dd>
        </dl>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Izoh (ixtiyoriy)
          <input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Masalan, kvitansiya raqami"
            className={controlClass(false, 'h-9 px-3 font-normal')}
          />
        </label>
        {confirm.error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {errorMessage(confirm.error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
