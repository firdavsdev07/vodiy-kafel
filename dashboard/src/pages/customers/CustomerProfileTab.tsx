import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useCan } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { useBranchManagers, useUpdateCustomer } from '@/features/customers/api';
import {
  customerProfileSchema,
  profileDefaults,
  toUpdateCustomerBody,
  type ProfileInput,
  type ProfileValues,
} from '@/features/customers/customer-profile';
import { useCustomerOutlet } from '@/features/customers/use-customer-outlet';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { useUnsavedChanges } from '@/shared/lib/use-unsaved-changes';
import { Button, DateText, InputField, PhoneField, SelectField, toast, UnsavedChangesDialog } from '@/shared/ui';

/** "Profil" tab (D-022). Login o'zgarmaydi. */
export default function CustomerProfileTab() {
  const c = useCustomerOutlet();
  const allBranches = useCan('customers.allBranches');
  const assignManager = useCan('managers.view');
  const update = useUpdateCustomer(c.id);
  const branches = useBranches(allBranches);

  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: profileDefaults(c),
  });
  const { isDirty } = form.formState;
  const { blocker } = useUnsavedChanges(isDirty);
  const branchId = useWatch({ control: form.control, name: 'branchId' });
  const branchChanged = branchId !== c.branch.id;
  const managers = useBranchManagers(c.branch.id, assignManager && !branchChanged);

  const onSubmit = form.handleSubmit((values) => {
    if (update.isPending) return;
    const body = toUpdateCustomerBody(values, c, { changeBranch: allBranches, assignManager });
    if (Object.keys(body).length === 0) return form.reset(profileDefaults(c));
    update.mutate(body, {
      onSuccess: (updated) => {
        toast.success('Profil saqlandi');
        form.reset(profileDefaults(updated ?? c));
      },
      onError: (error) => {
        if (error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 404)) {
          form.setError('root', { message: errorMessage(error) });
        } else toast.error(error);
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset disabled={update.isPending} className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-sm font-medium">Login</span>
          <p className="font-mono text-sm text-muted">{c.login} · o‘zgarmaydi</p>
        </div>
        <InputField control={form.control} name="companyName" label="Kompaniya" required maxLength={200} />
        <InputField control={form.control} name="inn" label="INN" inputMode="numeric" maxLength={9} hint="Bo‘sh qoldirilsa — o‘chiriladi" />
        <InputField control={form.control} name="contactName" label="Mas’ul shaxs" required maxLength={150} />
        <PhoneField control={form.control} name="phone" label="Telefon" required />

        {allBranches && (
          <SelectField
            control={form.control}
            name="branchId"
            label="Filial"
            required
            options={(branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name, disabled: !b.isActive && b.id !== c.branch.id }))}
            placeholder={branches.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
          />
        )}
        {assignManager && (
          <SelectField
            control={form.control}
            name="managerId"
            label="Menejer"
            disabled={branchChanged}
            placeholder="Biriktirilmagan"
            options={[
              ...(c.manager && !(managers.data ?? []).some((m) => m.id === c.manager?.id)
                ? [{ value: c.manager.id, label: c.manager.fullName }]
                : []),
              ...(managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName })),
            ]}
            hint={branchChanged ? 'Filial o‘zgarsa — avval saqlang, keyin yangi filial menejerini tanlang' : undefined}
          />
        )}
        {!assignManager && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Menejer</span>
            <p className="text-sm text-muted">{c.manager?.fullName ?? 'Biriktirilmagan'}</p>
          </div>
        )}

        {branchChanged && (
          <p role="alert" className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning md:col-span-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Mijoz boshqa filialga o‘tadi: <strong>narxlari yangi filial narxiga o‘zgaradi</strong>, eski filial menejeri
              uziladi. Eski buyurtmalar o‘zgarmaydi.
            </span>
          </p>
        )}
      </fieldset>

      <p className="text-xs text-muted">
        Yaratgan: {c.createdBy.fullName} · <DateText value={c.createdAt} /> · oxirgi o‘zgarish: <DateText value={c.updatedAt} />
      </p>

      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        {isDirty && <span className="mr-auto text-sm text-muted">Saqlanmagan o‘zgarishlar bor</span>}
        <Button onClick={() => form.reset(profileDefaults(c))} disabled={!isDirty || update.isPending}>
          Bekor qilish
        </Button>
        <Button variant="primary" type="submit" pending={update.isPending} disabled={!isDirty}>
          Saqlash
        </Button>
      </div>
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
