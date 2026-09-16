import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, InputField, Modal, toast } from '@/shared/ui';
import { useCreateSize, useUpdateSize } from './api';
import {
  previewLabel,
  sizeDefaults,
  sizeSchema,
  toUpdateBody,
  type Size,
  type SizeFormInput,
  type SizeFormValues,
} from './size-form';

const FORM_ID = 'size-form';

/** O'lcham yaratish / tahrirlash (D-010). `size` berilsa — tahrirlash. */
export function SizeFormModal({ open, size, onClose }: { open: boolean; size?: Size; onClose: () => void }) {
  const create = useCreateSize();
  const update = useUpdateSize();
  const pending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      size="sm"
      title={size ? `“${size.label}” o‘lchamini tahrirlash` : 'Yangi o‘lcham'}
      description="Yozuv (masalan 60x60) eni va bo‘yidan avtomatik yasaladi."
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={pending}>
            Saqlash
          </Button>
        </>
      }
    >
      {open && <SizeForm key={size?.id ?? 'new'} size={size} create={create} update={update} onDone={onClose} />}
    </Modal>
  );
}

function SizeForm({
  size,
  create,
  update,
  onDone,
}: {
  size?: Size;
  create: ReturnType<typeof useCreateSize>;
  update: ReturnType<typeof useUpdateSize>;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const form = useForm<SizeFormInput, unknown, SizeFormValues>({
    resolver: zodResolver(sizeSchema),
    defaultValues: sizeDefaults(size),
  });
  const [width, height] = useWatch({ control: form.control, name: ['widthCm', 'heightCm'] });
  const label = previewLabel(width, height);
  const dimensionsChanged = Boolean(size && label && label !== size.label);

  const onError = (error: unknown) => {
    // 409 — bunday o'lcham bor: xato "Eni" ostida (yozuv ikkalasidan yasaladi)
    if (error instanceof ApiError && (error.statusCode === 409 || error.statusCode === 400)) {
      form.setError('root', { message: errorMessage(error) });
    } else {
      toast.error(error);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!size) {
      create.mutate(values, {
        onSuccess: (created) => {
          toast.success(`“${created?.label ?? label}” o‘lchami qo‘shildi`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateBody(values, size);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: size.id, body },
      {
        onSuccess: () => {
          toast.success('O‘zgarishlar saqlandi');
          onDone();
        },
        onError,
      },
    );
  });

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} aria-busy={pending || undefined} className="flex flex-col gap-4">
      <fieldset disabled={pending} className="grid grid-cols-2 gap-4">
        <InputField control={form.control} name="widthCm" label="Eni, sm" required inputMode="numeric" autoComplete="off" autoFocus />
        <InputField control={form.control} name="heightCm" label="Bo‘yi, sm" required inputMode="numeric" autoComplete="off" />
        <InputField control={form.control} name="sortOrder" label="Tartib" required inputMode="numeric" hint="Filtrda kichik son — oldinroq" className="col-span-2" />
      </fieldset>

      <p className="text-sm text-muted">
        Yozuv: <strong className="font-mono text-fg">{label ?? '—'}</strong>
      </p>

      {dimensionsChanged && size && size.productCount > 0 && (
        <p role="alert" className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Bu o‘lchamdagi <strong>{size.productCount} ta mahsulot</strong> katalogda “{size.label}” emas, “{label}”
            bo‘lib ko‘rinadi va filtr natijalari o‘zgaradi.
          </span>
        </p>
      )}

      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
