import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useBranches } from '@/features/branches/api';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, InputField, Modal, PhoneField, SelectField, toast } from '@/shared/ui';
import { useCreateCustomer } from './api';
import {
  customerCreateSchema,
  customerDefaults,
  suggestLogin,
  toCreateCustomerBody,
  type CustomerFormInput,
  type CustomerFormValues,
} from './customer-form';

const FORM_ID = 'create-customer-form';

/**
 * Optom mijoz hisobini ochish (D-021). Muvaffaqiyatda `onCreated` ga login va
 * VAQTINCHALIK PAROL beriladi — ular faqat chaqiruvchining holatida yashaydi.
 */
export function CreateCustomerModal({
  open,
  isSuperAdmin,
  onClose,
  onCreated,
}: {
  open: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onCreated: (credentials: { login: string; password: string }) => void;
}) {
  const create = useCreateCustomer();
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!create.isPending}
      title="Yangi optom mijoz"
      description="Hisob ochiladi va vaqtinchalik parol beriladi. Mijoz o‘zi ro‘yxatdan o‘ta olmaydi."
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={create.isPending}>
            Hisob ochish
          </Button>
        </>
      }
    >
      {open && <CreateCustomerForm isSuperAdmin={isSuperAdmin} create={create} onCreated={onCreated} />}
    </Modal>
  );
}

function CreateCustomerForm({
  isSuperAdmin,
  create,
  onCreated,
}: {
  isSuperAdmin: boolean;
  create: ReturnType<typeof useCreateCustomer>;
  onCreated: (credentials: { login: string; password: string }) => void;
}) {
  const branches = useBranches(isSuperAdmin);
  const form = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerCreateSchema(isSuperAdmin)),
    defaultValues: customerDefaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (create.isPending) return;
    try {
      const result = await create.mutateAsync(toCreateCustomerBody(values, isSuperAdmin));
      // 🔒 Parol MutationCache'da qolmasin — natija olindi, holat darhol tozalanadi
      create.reset();
      if (!result) return;
      toast.success(`“${result.customer.companyName}” hisobi ochildi`);
      onCreated({ login: result.customer.login, password: result.temporaryPassword });
    } catch (error) {
      create.reset();
      if (error instanceof ApiError && error.statusCode === 409) {
        form.setError('login', { message: errorMessage(error) }, { shouldFocus: true });
      } else if (error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 404)) {
        form.setError('root', { message: errorMessage(error) });
      } else {
        toast.error(error);
      }
    }
  });

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={create.isPending} className="grid gap-4 sm:grid-cols-2">
        <InputField
          control={form.control}
          name="companyName"
          label="Kompaniya"
          required
          maxLength={200}
          autoFocus
          className="sm:col-span-2"
          onBlur={(e) => {
            if (!form.getValues('login') && e.target.value) {
              form.setValue('login', suggestLogin(e.target.value), { shouldValidate: false });
            }
          }}
        />
        <InputField control={form.control} name="login" label="Login" required maxLength={64} autoComplete="off" spellCheck={false}
          hint="Mijoz shu bilan kiradi. Keyin o‘zgarmaydi." />
        <InputField control={form.control} name="inn" label="INN" inputMode="numeric" maxLength={9} hint="9 raqam — shartnoma uchun" />
        <InputField control={form.control} name="contactName" label="Mas’ul shaxs" required maxLength={150} />
        <PhoneField control={form.control} name="phone" label="Telefon" required />
        {isSuperAdmin && (
          <SelectField
            control={form.control}
            name="branchId"
            label="Filial"
            required
            className="sm:col-span-2"
            placeholder={branches.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
            options={(branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name, disabled: !b.isActive }))}
            hint="Mijoz shu filial narxlari bilan ishlaydi"
          />
        )}
      </fieldset>
      <p className="text-xs text-muted">
        Individual narx qoidalari va menejer biriktirish — mijoz kartasida (D-019, D-022).
      </p>
      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
