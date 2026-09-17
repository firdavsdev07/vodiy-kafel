import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useProfile } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { useCreateManualOrder, useCustomerSearch } from '@/features/orders/api';
import {
  MANUAL_SOURCES,
  manualOrderDefaults,
  manualOrderSchema,
  PAYMENT_METHODS,
  toManualOrderBody,
  type CustomerPick,
  type ManualOrderInput,
  type ManualOrderValues,
} from '@/features/orders/manual';
import { BackLink } from '@/features/orders/OrderDetailParts';
import { ProductSearch } from '@/features/products/ProductSearch';
import { usePublicRegions, usePublicTransportTypes } from '@/features/supply-orders/api';
import { duplicateReason, MAX_SUPPLY_ITEMS } from '@/features/supply-orders/create';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { formatMoney } from '@/shared/lib/format';
import { orderSourceLabel, paymentMethodLabel } from '@/shared/lib/labels';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { useUnsavedChanges } from '@/shared/lib/use-unsaved-changes';
import {
  BalanceText,
  Button,
  CheckboxField,
  IconButton,
  InputField,
  PhoneField,
  SelectField,
  TextareaField,
  toast,
  UnsavedChangesDialog,
} from '@/shared/ui';
import { controlClass } from '@/shared/ui/form/control-class';

/**
 * Qo'lda buyurtma kiritish — telefon / Telegram (D-028). Barcha xodim.
 *
 * ❗ `/calculator/*` xodim tokeni bilan ISHLAMAYDI (❓ 2) — summa yuborishdan
 *    OLDIN ko'rsatilmaydi. Vaqtinchalik yechim: yaratilgach buyurtma kartasi
 *    ochiladi va xabarda jami summa aytiladi; xato bo'lsa — kartadan bekor
 *    qilinadi (D-026).
 * 🔒 Forma summa yubormaydi (G1). Menejer kiritsa — buyurtma unga biriktiriladi.
 */
export default function OrderCreatePage() {
  const navigate = useNavigate();
  const profile = useProfile().data;
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const create = useCreateManualOrder();
  const branches = useBranches(isSuperAdmin);

  const form = useForm<ManualOrderInput, unknown, ManualOrderValues>({
    resolver: zodResolver(manualOrderSchema({ branchRequired: isSuperAdmin })),
    defaultValues: manualOrderDefaults,
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const [buyerKind, delivery] = useWatch({ control: form.control, name: ['buyerKind', 'delivery'] });
  const regions = usePublicRegions(delivery === 'DELIVERY');
  const transports = usePublicTransportTypes(delivery === 'DELIVERY');
  const { blocker, allowNavigation } = useUnsavedChanges(form.formState.isDirty);

  const onSubmit = form.handleSubmit((values) => {
    if (create.isPending) return;
    create.mutate(toManualOrderBody(values), {
      onSuccess: (order) => {
        // Summa faqat SHU yerda ma'lum bo'ladi — xodim mijozga aytishi uchun xabarda
        toast.success(`${order.orderNumber} yaratildi — jami ${formatMoney(order.grandTotal)}`);
        allowNavigation();
        void navigate(`/orders/${order.id}`, { replace: true });
      },
      onError: (error) => {
        // 409 — omborda yetarli emas; 404 — mijoz/mahsulot/tarif; 400 — tarkib, faol emas
        if (error instanceof ApiError && [400, 404, 409].includes(error.statusCode)) {
          form.setError('root', { message: errorMessage(error) });
        } else toast.error(error);
      },
    });
  });

  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;
  const activeBranches = (branches.data ?? []).filter((b) => b.isActive);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <BackLink to="/orders" label="Buyurtmalar" />

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset disabled={create.isPending} className="flex flex-col gap-4">
          {/* ── Xaridor ── */}
          <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Xaridor</h2>
              <Controller
                control={form.control}
                name="buyerKind"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Xaridor turi" className="inline-flex rounded-md border border-line-strong p-0.5">
                    {(
                      [
                        ['CUSTOMER', 'Optom mijoz'],
                        ['GUEST', 'Hisobsiz xaridor'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={`h-8 rounded-sm px-3 text-sm ${field.value === value ? 'bg-accent font-medium text-accent-contrast' : 'text-muted hover:text-fg'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {buyerKind === 'CUSTOMER' ? (
              <Controller
                control={form.control}
                name="customer"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    {field.value ? (
                      <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{field.value.companyName}</p>
                          <p className="truncate text-xs text-muted">
                            <span className="font-mono">{field.value.login}</span> · {field.value.branch.name}
                          </p>
                        </div>
                        <button type="button" onClick={() => field.onChange(null)} aria-label="Boshqa mijoz tanlash" className="text-muted hover:text-fg">
                          <X size={15} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <CustomerPicker onPick={field.onChange} />
                    )}
                    <p className="text-xs text-muted">Narx — mijoz filialining narxi va shaxsiy qoidalari bo‘yicha; summa qarzga yoziladi.</p>
                    {fieldState.error && <p className="text-xs text-danger">{fieldState.error.message}</p>}
                  </div>
                )}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField control={form.control} name="guestName" label="Ism" required maxLength={150} placeholder="Aziz aka" />
                <PhoneField control={form.control} name="guestPhone" label="Telefon" required />
                {isSuperAdmin && (
                  <SelectField
                    control={form.control}
                    name="branchId"
                    label="Filial"
                    required
                    placeholder={branches.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
                    options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
                    className="sm:col-span-2"
                  />
                )}
                <p className="text-xs text-muted sm:col-span-2">Hisobsiz xaridorga filialning bazaviy narxi qo‘llanadi; qarz yozilmaydi.</p>
              </div>
            )}
          </section>

          {/* ── Mahsulotlar ── */}
          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">Mahsulotlar</h2>
            <ProductSearch
              onPick={(product) => items.append({ product, pallets: '1' })}
              unavailable={(p) => duplicateReason(form.getValues('items'), p)}
              disabled={items.fields.length >= MAX_SUPPLY_ITEMS ? `Ko‘pi bilan ${MAX_SUPPLY_ITEMS} ta mahsulot` : undefined}
            />
            {items.fields.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-sm text-muted">Hali mahsulot qo‘shilmagan</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                {items.fields.map((field, index) => {
                  const error = form.formState.errors.items?.[index]?.pallets?.message;
                  return (
                    <li key={field.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{field.product.name}</span>
                      <label className="flex items-center gap-2 text-sm text-muted">
                        Paddon
                        <input
                          {...form.register(`items.${index}.pallets`)}
                          inputMode="numeric"
                          aria-invalid={Boolean(error) || undefined}
                          className={controlClass(Boolean(error), 'h-8 w-24 px-2 text-right tabular-nums')}
                        />
                      </label>
                      <IconButton label={`${field.product.name} — olib tashlash`} onClick={() => items.remove(index)} danger>
                        <Trash2 size={15} aria-hidden />
                      </IconButton>
                      {error && <p className="w-full text-right text-xs text-danger">{error}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            {itemsError && <p className="text-xs text-danger">{itemsError}</p>}
          </section>

          {/* ── Yetkazib berish va to'lov ── */}
          <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 md:grid-cols-2">
            <SelectField
              control={form.control}
              name="delivery"
              label="Qabul qilish"
              required
              options={[
                { value: 'PICKUP', label: 'Olib ketish (yo‘l kira yo‘q)' },
                { value: 'DELIVERY', label: 'Yetkazib berish' },
              ]}
            />
            <SelectField
              control={form.control}
              name="source"
              label="Manba"
              required
              options={MANUAL_SOURCES.map((s) => ({ value: s, label: orderSourceLabel[s] }))}
            />
            {delivery === 'DELIVERY' && (
              <>
                <SelectField
                  control={form.control}
                  name="regionId"
                  label="Viloyat"
                  required
                  placeholder={regions.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
                  options={(regions.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
                />
                <SelectField
                  control={form.control}
                  name="transportTypeId"
                  label="Transport"
                  required
                  placeholder={transports.isPending ? 'Yuklanmoqda…' : 'Tanlang…'}
                  options={(transports.data ?? []).map((t) => ({ value: t.id, label: `${t.name} — ${t.capacityPallets} paddongacha` }))}
                />
              </>
            )}
            <SelectField
              control={form.control}
              name="paymentMethod"
              label="To‘lov usuli"
              required
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel[m] }))}
            />
            <div className="flex items-end pb-2">
              <CheckboxField control={form.control} name="isUrgent" label="Tezkor buyurtma" />
            </div>
            <TextareaField control={form.control} name="note" label="Izoh" maxLength={1000} className="md:col-span-2" />
          </section>
        </fieldset>

        {form.formState.errors.root && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex max-w-xl items-start gap-2 text-xs text-muted">
            <Info size={14} className="mt-px shrink-0" aria-hidden />
            Summa backendda hisoblanadi va yaratilgandan keyin buyurtma kartasida ko‘rinadi. Xato bo‘lsa — kartadan bekor qiling.
          </p>
          <Button variant="primary" type="submit" pending={create.isPending}>
            Buyurtma yaratish
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

/** Faol optom mijozni qidirib tanlash: 2+ harf, debounce, 10 natija. */
function CustomerPicker({ onPick }: { onPick: (c: CustomerPick) => void }) {
  const [text, setText] = useState('');
  const search = useDebouncedValue(text.trim());
  const results = useCustomerSearch(search);
  const list = results.data?.items ?? [];
  const show = search.length >= 2;

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex max-w-md">
        <span className="sr-only">Mijoz qidirish</span>
        <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kompaniya, login, telefon yoki INN (2+ harf)…"
          className="h-9 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-muted/70"
        />
      </label>
      {show && (
        <div aria-live="polite" className="max-w-md rounded-md border border-line">
          {results.isPending ? (
            <p className="px-3 py-2 text-sm text-muted">Qidirilmoqda…</p>
          ) : results.error ? (
            <p className="px-3 py-2 text-sm text-danger">{errorMessage(results.error)}</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Faol mijoz topilmadi</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.companyName}</p>
                    <p className="truncate text-xs text-muted">
                      <span className="font-mono">{c.login}</span> · {c.branch.name}
                    </p>
                  </div>
                  <BalanceText value={c.balance} />
                  <Button size="sm" onClick={() => onPick({ id: c.id, companyName: c.companyName, login: c.login, branch: c.branch })}>
                    Tanlash
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
