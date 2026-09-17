import { zodResolver } from '@hookform/resolvers/zod';
import type { UseMutationResult } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, InputField, Modal, PhoneField, SelectField, toast, type SelectOption } from '@/shared/ui';
import {
  staffDefaults,
  staffSchema,
  toCreateStaffBody,
  toUpdateStaffBody,
  type CreateStaffBody,
  type Staff,
  type StaffFormInput,
  type StaffFormValues,
  type UpdateStaffBody,
} from './staff-form';

const FORM_ID = 'staff-form';

export type CreateStaffMutation = UseMutationResult<{ staff: Staff; temporaryPassword: string }, Error, CreateStaffBody>;
export type UpdateStaffMutation = UseMutationResult<Staff, Error, { id: string; body: UpdateStaffBody }>;

/**
 * Xodim qo'shish / tahrirlash — menejer (D-035) va moderator (D-036).
 * Mutatsiyalarni sahifa beradi (endpoint roliga qarab boshqa).
 *
 * 🔒 `branchOptions: null` — filial maydoni UMUMAN yo'q (filial admini, G5):
 *    backend o'z filialiga yozadi. Yangi xodimning vaqtinchalik paroli
 *    `onCreated` orqali chaqiruvchiga beriladi va FAQAT bir marta ko'rsatiladi.
 */
export function StaffFormModal({
  open,
  staff,
  title,
  branchOptions,
  branchHint,
  create,
  update,
  onClose,
  onCreated,
}: {
  open: boolean;
  staff?: Staff;
  title: { create: string; edit: string };
  branchOptions: readonly SelectOption[] | null;
  branchHint?: string;
  create: CreateStaffMutation;
  update: UpdateStaffMutation;
  onClose: () => void;
  onCreated: (credentials: { login: string; password: string }) => void;
}) {
  const pending = create.isPending || update.isPending;

  const close = () => {
    create.reset();
    update.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!pending}
      title={staff ? `${staff.fullName} — ${title.edit}` : title.create}
      description={staff ? undefined : 'Xodim telefon raqami bilan kiradi. Vaqtinchalik parol faqat bir marta ko‘rsatiladi.'}
      footer={
        <>
          <Button onClick={close} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={pending}>
            {staff ? 'Saqlash' : 'Qo‘shish'}
          </Button>
        </>
      }
    >
      {open && (
        <StaffForm
          key={staff?.id ?? 'new'}
          staff={staff}
          branchOptions={branchOptions}
          branchHint={branchHint}
          create={create}
          update={update}
          onDone={close}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

function StaffForm({
  staff,
  branchOptions,
  branchHint,
  create,
  update,
  onDone,
  onCreated,
}: {
  staff?: Staff;
  branchOptions: readonly SelectOption[] | null;
  branchHint?: string;
  create: CreateStaffMutation;
  update: UpdateStaffMutation;
  onDone: () => void;
  onCreated: (credentials: { login: string; password: string }) => void;
}) {
  const pending = create.isPending || update.isPending;
  const withBranch = branchOptions !== null;
  const form = useForm<StaffFormInput, unknown, StaffFormValues>({
    resolver: zodResolver(staffSchema({ branchRequired: withBranch })),
    defaultValues: staffDefaults(staff),
  });

  const onError = (error: unknown) => {
    // 409 — telefon band: xato telefon maydoni ostida
    if (error instanceof ApiError && error.statusCode === 409) {
      form.setError('phone', { message: errorMessage(error) }, { shouldFocus: true });
    } else if (error instanceof ApiError && [400, 403, 404].includes(error.statusCode)) {
      form.setError('root', { message: errorMessage(error) });
    } else toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!staff) {
      create.mutate(toCreateStaffBody(values), {
        onSuccess: (res) => {
          // 🔒 Parol faqat chaqiruvchi holatiga — mutatsiya natijasi darhol tozalanadi
          const credentials = { login: res.staff.phone, password: res.temporaryPassword };
          create.reset();
          onDone();
          onCreated(credentials);
        },
        onError,
      });
      return;
    }
    const body = toUpdateStaffBody(values, staff, withBranch);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: staff.id, body },
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
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <InputField control={form.control} name="fullName" label="F.I.Sh." required maxLength={150} autoComplete="off" className="sm:col-span-2" />
        <PhoneField control={form.control} name="phone" label="Telefon (login)" required hint={staff ? 'O‘zgarsa — xodim yangi raqam bilan kiradi' : undefined} />
        <InputField control={form.control} name="telegramUsername" label="Telegram username" placeholder="vk_fargona" maxLength={33} hint="Mijozlar bog‘lanishi uchun, ixtiyoriy" />
        {withBranch && (
          <SelectField
            control={form.control}
            name="branchId"
            label="Filial"
            required
            hint={branchHint}
            options={branchOptions}
            className="sm:col-span-2"
          />
        )}
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
