import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useCan } from '@/features/auth/hooks';
import { useSettings, useUpdateSetting } from '@/features/settings/api';
import {
  formatAccount,
  percentSchema,
  readNumber,
  readRequisites,
  requisitesDefaults,
  requisitesSchema,
  thresholdSchema,
  type RequisitesInput,
  type Setting,
  type SettingKey,
} from '@/features/settings/settings';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, ConfirmDialog, DateText, ErrorState, InputField, PageLoading, toast } from '@/shared/ui';

/**
 * Sozlamalar (D-040). Backend taniydigan UCHTA kalit — har biri o'z maydoni
 * bilan. `isDefault: true` — bazada hali yozuv yo'q, tizim standarti ishlaydi.
 * 🔒 Ko'rish — SUPER_ADMIN, BRANCH_ADMIN; o'zgartirish — faqat SUPER_ADMIN.
 */
export default function SettingsPage() {
  const canWrite = useCan('settings.write');
  const settings = useSettings();

  if (settings.isPending) return <PageLoading />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} retrying={settings.isFetching} />;

  const byKey = new Map(settings.data.map((s) => [s.key, s]));
  const get = (key: SettingKey) => byKey.get(key);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {!canWrite && (
        <p className="rounded-md bg-info-soft px-3 py-2 text-sm text-info">Sozlamalarni faqat bosh administrator o‘zgartira oladi.</p>
      )}
      <NumberSetting
        setting={get('stock.lowThresholdPallets')}
        title="«Kam qoldi» chegarasi"
        description="Markaziy omborda mahsulot shu paddon sonidan kam qolsa — “Kam qoldi” holati. Mahsulotga alohida chegara qo‘yilmagan bo‘lsa shu ishlatiladi."
        suffix="paddon"
        schema={thresholdSchema}
        canWrite={canWrite}
      />
      <NumberSetting
        setting={get('pricing.branchAdminMaxDiscountPercent')}
        title="Filial admini chegirma chegarasi"
        description="Filial administratori mijozga bera oladigan eng katta foizli chegirma. 0 — umuman bera olmaydi."
        suffix="%"
        schema={percentSchema}
        canWrite={canWrite}
      />
      <RequisitesSetting setting={get('payment.requisites')} canWrite={canWrite} />
    </div>
  );
}

function SettingCard({ setting, title, description, children }: { setting: Setting | undefined; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {setting?.isDefault && <Badge tone="neutral">Standart qiymat</Badge>}
          {setting?.isPublic && <Badge tone="info">Saytda ochiq</Badge>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
      {setting?.updatedAt && (
        <p className="mt-3 text-xs text-muted">
          Oxirgi o‘zgarish: <DateText value={setting.updatedAt} />
        </p>
      )}
      <p className="mt-1 font-mono text-xs text-muted/70">{setting?.key}</p>
    </section>
  );
}

const onSettingError = (setError: (message: string) => void) => (error: Error) => {
  if (error instanceof ApiError && error.statusCode === 400) setError(errorMessage(error));
  else toast.error(error);
};

function NumberSetting({
  setting,
  title,
  description,
  suffix,
  schema,
  canWrite,
}: {
  setting: Setting | undefined;
  title: string;
  description: string;
  suffix: string;
  schema: typeof thresholdSchema | typeof percentSchema;
  canWrite: boolean;
}) {
  const update = useUpdateSetting();
  const current = readNumber(setting?.value);
  const form = useForm<{ value: string }, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    values: { value: current === null ? '' : String(current) },
  });

  const onSubmit = form.handleSubmit(({ value }) => {
    if (!setting || update.isPending) return;
    if (value === current) return;
    update.mutate(
      { key: setting.key, value },
      {
        onSuccess: () => toast.success(`${title}: ${value} ${suffix}`),
        onError: onSettingError((message) => form.setError('value', { message })),
      },
    );
  });

  return (
    <SettingCard setting={setting} title={title} description={description}>
      {canWrite ? (
        <form noValidate onSubmit={onSubmit} className="flex flex-wrap items-start gap-3">
          <InputField control={form.control} name="value" label={`Qiymat, ${suffix}`} inputMode="decimal" required disabled={update.isPending} className="w-48" />
          <Button variant="primary" type="submit" pending={update.isPending} disabled={!form.formState.isDirty} className="mt-6">
            Saqlash
          </Button>
        </form>
      ) : (
        <p className="text-2xl font-semibold tabular-nums">
          {current === null ? <span className="text-sm text-danger">Qiymatni o‘qib bo‘lmadi</span> : `${current} ${suffix}`}
        </p>
      )}
    </SettingCard>
  );
}

/**
 * Bank rekvizitlari — o'tkazma (perechislenie) uchun, saytda ochiq.
 * `null` — rekvizit ko'rsatilmaydi; tozalash — tasdiq bilan.
 */
function RequisitesSetting({ setting, canWrite }: { setting: Setting | undefined; canWrite: boolean }) {
  const update = useUpdateSetting();
  const current = readRequisites(setting?.value);
  const [confirmClear, setConfirmClear] = useState(false);
  const form = useForm<RequisitesInput, unknown, z.output<typeof requisitesSchema>>({
    resolver: zodResolver(requisitesSchema),
    values: requisitesDefaults(setting?.value),
  });

  const title = 'Bank rekvizitlari';
  const description = 'Hisob raqamga o‘tkazma (perechislenie) bilan to‘lovchi mijozlarga ko‘rsatiladi.';

  const onSubmit = form.handleSubmit((values) => {
    if (!setting || update.isPending) return;
    update.mutate(
      { key: setting.key, value: values },
      {
        onSuccess: () => toast.success('Bank rekvizitlari saqlandi'),
        onError: onSettingError((message) => form.setError('root', { message })),
      },
    );
  });

  if (!canWrite) {
    return (
      <SettingCard setting={setting} title={title} description={description}>
        {current ? <RequisitesView value={current} /> : <p className="text-sm text-muted">Rekvizitlar kiritilmagan</p>}
      </SettingCard>
    );
  }

  return (
    <SettingCard setting={setting} title={title} description={description}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset disabled={update.isPending} className="grid gap-4 sm:grid-cols-2">
          <InputField control={form.control} name="name" label="Tashkilot nomi" required maxLength={200} className="sm:col-span-2" />
          <InputField control={form.control} name="bank" label="Bank" required maxLength={200} />
          <InputField control={form.control} name="mfo" label="MFO" required inputMode="numeric" maxLength={5} hint="5 ta raqam" />
          <InputField control={form.control} name="account" label="Hisob raqam" required inputMode="numeric" maxLength={20} hint="20 ta raqam" />
          <InputField control={form.control} name="inn" label="INN" required inputMode="numeric" maxLength={9} hint="9 ta raqam" />
        </fieldset>
        {form.formState.errors.root && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {current && (
            <Button variant="ghost" onClick={() => setConfirmClear(true)} disabled={update.isPending}>
              Rekvizitlarni olib tashlash
            </Button>
          )}
          <Button variant="primary" type="submit" pending={update.isPending} disabled={!form.formState.isDirty}>
            Saqlash
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmClear}
        onClose={() => {
          setConfirmClear(false);
          update.reset();
        }}
        danger
        title="Bank rekvizitlarini olib tashlash?"
        description="Mijozlar o‘tkazma uchun rekvizitlarni ko‘rmaydi — yangisi kiritilguncha."
        confirmText="Olib tashlash"
        pending={update.isPending}
        error={update.error ? errorMessage(update.error) : undefined}
        onConfirm={() =>
          setting &&
          update.mutate(
            { key: setting.key, value: null },
            {
              onSuccess: () => {
                toast.success('Rekvizitlar olib tashlandi');
                setConfirmClear(false);
              },
            },
          )
        }
      />
    </SettingCard>
  );
}

function RequisitesView({ value }: { value: { bank: string; mfo: string; account: string; inn: string; name: string } }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      <dt className="text-muted">Tashkilot</dt>
      <dd>{value.name}</dd>
      <dt className="text-muted">Bank</dt>
      <dd>{value.bank}</dd>
      <dt className="text-muted">MFO</dt>
      <dd className="tabular-nums">{value.mfo}</dd>
      <dt className="text-muted">Hisob raqam</dt>
      <dd className="tabular-nums">{formatAccount(value.account)}</dd>
      <dt className="text-muted">INN</dt>
      <dd className="tabular-nums">{value.inn}</dd>
    </dl>
  );
}
