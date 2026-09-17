import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney } from '@/shared/lib/format';
import { transactionTypeLabel } from '@/shared/lib/labels';
import { Button, Modal, MoneyField, SelectField, TextareaField, toast, type SelectOption } from '@/shared/ui';
import { useCreateTransaction } from './api';
import {
  adjustmentDirectionLabel,
  balanceEffect,
  manualTypeHint,
  toCreateTransactionBody,
  transactionDefaults,
  transactionSchema,
  type TransactionInput,
  type TransactionValues,
} from './transactions';

const FORM_ID = 'add-transaction-form';

const typeOptions: SelectOption[] = (['PAYMENT', 'DEBT', 'ADJUSTMENT'] as const).map((t) => ({
  value: t,
  label: transactionTypeLabel[t],
}));
const directionOptions: SelectOption[] = (['DECREASE', 'INCREASE'] as const).map((d) => ({
  value: d,
  label: adjustmentDirectionLabel[d],
}));

/**
 * Qo'lda hisob yozuvi (D-023) — ikki bosqich: forma → tasdiq. Yozuv
 * keyin O'ZGARTIRILMAYDI va O'CHIRILMAYDI, shuning uchun xodim summani va
 * yo'nalishni yuborishdan oldin yana bir bor ko'radi.
 */
export function AddTransactionModal({
  open,
  customerId,
  customerName,
  onClose,
}: {
  open: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
}) {
  const create = useCreateTransaction(customerId);
  const form = useForm<TransactionInput, unknown, TransactionValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transactionDefaults,
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const [pending, setPending] = useState<TransactionValues | null>(null);

  const close = () => {
    form.reset(transactionDefaults);
    create.reset();
    setPending(null);
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => setPending(values));

  const confirm = () => {
    if (!pending || create.isPending) return;
    create.mutate(toCreateTransactionBody(pending), {
      onSuccess: () => {
        toast.success('Hisob yozuvi qo‘shildi');
        close();
      },
    });
  };

  const effect = pending ? balanceEffect(pending) : null;

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      title={pending ? 'Yozuvni tasdiqlang' : 'Qo‘lda hisob yozuvi'}
      description={
        pending
          ? 'Yozuv saqlangach o‘zgartirilmaydi va o‘chirilmaydi. Xato bo‘lsa — teskari tuzatish kiritiladi.'
          : `“${customerName}” hisobiga. Buyurtma to‘lovlari bu yerda emas — ular buyurtma kartasida tasdiqlanadi.`
      }
      footer={
        pending ? (
          <>
            <Button onClick={() => { setPending(null); create.reset(); }} disabled={create.isPending}>
              Orqaga
            </Button>
            <Button variant="primary" onClick={confirm} pending={create.isPending}>
              Tasdiqlash va saqlash
            </Button>
          </>
        ) : (
          <>
            <Button onClick={close}>Bekor qilish</Button>
            <Button variant="primary" type="submit" form={FORM_ID}>
              Davom etish
            </Button>
          </>
        )
      }
    >
      {pending && effect ? (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-line bg-surface-muted px-4 py-3 text-sm">
            <dt className="text-muted">Tur</dt>
            <dd className="font-medium">{transactionTypeLabel[pending.type]}</dd>
            <dt className="text-muted">Summa</dt>
            <dd className="font-medium tabular-nums">{formatMoney(pending.amount)}</dd>
            <dt className="text-muted">Balansga ta’siri</dt>
            <dd className={effect === 'increase' ? 'text-danger' : 'text-success'}>
              {effect === 'increase' ? 'Qarz oshadi' : 'Qarz kamayadi'}
            </dd>
            <dt className="text-muted">Sabab</dt>
            <dd className="whitespace-pre-line break-words">{pending.note}</dd>
          </dl>
          {create.error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
              {errorMessage(create.error)}
            </p>
          )}
        </div>
      ) : (
        <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <SelectField control={form.control} name="type" label="Tur" required options={typeOptions} hint={manualTypeHint[type]} />
          {type === 'ADJUSTMENT' && (
            <SelectField control={form.control} name="direction" label="Yo‘nalish" required options={directionOptions} />
          )}
          <MoneyField control={form.control} name="amount" label="Summa" required />
          <TextareaField
            control={form.control}
            name="note"
            label="Sabab"
            required
            maxLength={500}
            hint="Majburiy — keyin “nega qo‘lda o‘zgartirildi” degan savolga javob shu yerda"
          />
        </form>
      )}
    </Modal>
  );
}
