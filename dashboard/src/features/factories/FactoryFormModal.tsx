import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, InputField, Modal, TextareaField, Thumb, toast } from '@/shared/ui';
import { useCreateFactory, useUpdateFactory } from './api';
import {
  factoryDefaults,
  factorySchema,
  toCreateBody,
  toUpdateBody,
  type Factory,
  type FactoryFormInput,
  type FactoryFormValues,
} from './factory-form';

const FORM_ID = 'factory-form';

/** Zavod yaratish / tahrirlash (D-009). `factory` berilsa — tahrirlash. */
export function FactoryFormModal({
  open,
  factory,
  onClose,
}: {
  open: boolean;
  factory?: Factory;
  onClose: () => void;
}) {
  // Mutatsiyalar shu yerda — "Saqlash" tugmasi (footer) va forma bir holatni ko'rsin
  const create = useCreateFactory();
  const update = useUpdateFactory();
  const pending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title={factory ? 'Zavodni tahrirlash' : 'Yangi zavod'}
      description={factory ? <>URL: <code className="font-mono">{factory.slug}</code> — nom o‘zgarsa ham o‘zgarmaydi</> : 'URL nomdan avtomatik yasaladi va keyin o‘zgarmaydi'}
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
      {/* key: har ochilishda forma toza qiymatlar bilan qayta yaratiladi */}
      {open && (
        <FactoryForm
          key={factory?.id ?? 'new'}
          factory={factory}
          create={create}
          update={update}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function FactoryForm({
  factory,
  create,
  update,
  onDone,
}: {
  factory?: Factory;
  create: ReturnType<typeof useCreateFactory>;
  update: ReturnType<typeof useUpdateFactory>;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;

  const form = useForm<FactoryFormInput, unknown, FactoryFormValues>({
    resolver: zodResolver(factorySchema),
    defaultValues: factoryDefaults(factory),
  });
  const [logoPreview, nameValue] = useWatch({ control: form.control, name: ['logoUrl', 'name'] });

  const onError = (error: unknown) => {
    // 409 — nom band yoki nomdan URL yasab bo'lmadi: xato "Nomi" maydoni ostida
    if (error instanceof ApiError && error.statusCode === 409) {
      form.setError('name', { message: errorMessage(error) }, { shouldFocus: true });
    } else if (error instanceof ApiError && error.statusCode === 400) {
      form.setError('root', { message: errorMessage(error) });
    } else {
      toast.error(error);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return; // Enter ikki marta — ikki so'rov emas
    if (!factory) {
      create.mutate(toCreateBody(values), {
        onSuccess: (created) => {
          toast.success(`"${created?.name ?? values.name}" zavodi qo‘shildi`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateBody(values, factory);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: factory.id, body },
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
    <form id={FORM_ID} noValidate onSubmit={onSubmit} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <InputField control={form.control} name="name" label="Nomi" required maxLength={120} autoComplete="off" className="sm:col-span-2" />
        <InputField
          control={form.control}
          name="logoUrl"
          label="Logotip"
          required
          maxLength={500}
          placeholder="/uploads/factories/yongxin.png"
          hint="Fayl yo‘li yoki to‘liq havola. Zavod logotipini yuklash endpointi backendda hali yo‘q."
        />
        <div className="flex items-start justify-center pt-6">
          <Thumb src={logoPreview} name={nameValue || 'Logo'} size="lg" alt="Logotip ko‘rinishi" />
        </div>
        <InputField control={form.control} name="websiteUrl" label="Sayt" type="url" placeholder="https://…" maxLength={500} className="sm:col-span-2"
          hint={factory?.websiteUrl ? 'Bo‘sh qoldirilsa eski manzil saqlanadi (backend o‘chirishni qo‘llamaydi).' : undefined} />
        <TextareaField control={form.control} name="description" label="Tavsif" maxLength={2000} rows={3} className="sm:col-span-2" />
        <InputField control={form.control} name="sortOrder" label="Tartib" inputMode="numeric" required hint="Kichik son — vitrinada oldinroq" />
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
      {pending && <span className="sr-only" role="status">Saqlanmoqda…</span>}
    </form>
  );
}
