import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useBranches } from '@/features/branches/api';
import { BackLink } from '@/features/orders/OrderDetailParts';
import { ProductSearch } from '@/features/products/ProductSearch';
import { useCreateSupplyOrder, usePublicRegions, usePublicTransportTypes } from '@/features/supply-orders/api';
import {
  duplicateReason,
  MAX_SUPPLY_ITEMS,
  supplyOrderDefaults,
  supplyOrderSchema,
  toCreateSupplyBody,
  type SupplyOrderInput,
  type SupplyOrderValues,
} from '@/features/supply-orders/create';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { useUnsavedChanges } from '@/shared/lib/use-unsaved-changes';
import { Button, IconButton, SelectField, TextareaField, toast, UnsavedChangesDialog } from '@/shared/ui';
import { controlClass } from '@/shared/ui/form/control-class';

/**
 * Markazdan ta'minot buyurtmasi (D-032) — BRANCH_ADMIN, MANAGER.
 *
 * 🔒 Forma narx/summa YUBORMAYDI va ko'rsatmaydi: hisob — backendda (G1),
 *    `/calculator/*` esa xodim tokeni bilan ishlamaydi (❓ 2). Summa
 *    yuborilgandan keyin buyurtma kartasida chiqadi.
 * 🔒 Buyurtma bergan filial — tokendan (G5), formada yo'q.
 */
export default function SupplyOrderCreatePage() {
  const navigate = useNavigate();
  const create = useCreateSupplyOrder();
  const branches = useBranches(true);
  const centrals = (branches.data ?? []).filter((b) => b.type === 'CENTRAL' && b.isActive);

  const form = useForm<SupplyOrderInput, unknown, SupplyOrderValues>({
    resolver: zodResolver(supplyOrderSchema({ centralCount: centrals.length })),
    defaultValues: supplyOrderDefaults,
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const delivery = useWatch({ control: form.control, name: 'delivery' });
  const regions = usePublicRegions(delivery === 'DELIVERY');
  const transports = usePublicTransportTypes(delivery === 'DELIVERY');
  const { blocker, allowNavigation } = useUnsavedChanges(form.formState.isDirty);

  const onSubmit = form.handleSubmit((values) => {
    if (create.isPending) return;
    create.mutate(toCreateSupplyBody(values), {
      onSuccess: (order) => {
        toast.success(`${order.orderNumber} markazga yuborildi`);
        allowNavigation();
        void navigate(`/supply-orders/${order.id}`, { replace: true });
      },
      onError: (error) => {
        // 409 — omborda yetarli emas; 404 — markazda sotilmaydi / tarif yo'q; 400 — tarkib
        if (error instanceof ApiError && [400, 404, 409].includes(error.statusCode)) {
          form.setError('root', { message: errorMessage(error) });
        } else toast.error(error);
      },
    });
  });

  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <BackLink to="/supply-orders" label="Ta’minot buyurtmalari" />

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset disabled={create.isPending} className="flex flex-col gap-4">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-base font-semibold">Markazdan buyurtma</h2>
            <p className="mt-1 text-sm text-muted">
              Mahsulot va paddon sonini tanlang. Narx va yo‘l kira markaziy ombor narxlari bo‘yicha yuborilgandan keyin hisoblanadi.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <ProductSearch
                onPick={(product) => items.append({ product, pallets: '1' })}
                unavailable={(p) => duplicateReason(form.getValues('items'), p)}
                disabled={items.fields.length >= MAX_SUPPLY_ITEMS ? `Ko‘pi bilan ${MAX_SUPPLY_ITEMS} ta mahsulot` : undefined}
              />

              {items.fields.length === 0 ? (
                <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
                  Hali mahsulot qo‘shilmagan
                </p>
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
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 md:grid-cols-2">
            <SelectField
              control={form.control}
              name="delivery"
              label="Qabul qilish"
              required
              options={[
                { value: 'PICKUP', label: 'Olib ketamiz (markaziy ombordan)' },
                { value: 'DELIVERY', label: 'Yetkazib berish' },
              ]}
            />
            {centrals.length > 1 && (
              <SelectField
                control={form.control}
                name="centralBranchId"
                label="Markaziy ombor"
                required
                options={centrals.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
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
            <TextareaField control={form.control} name="note" label="Izoh" maxLength={1000} className="md:col-span-2" />
          </section>
        </fieldset>

        {form.formState.errors.root && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-muted">
            <Info size={14} aria-hidden />
            Omborda yetarli bo‘lmasa, markaz buyurtmani qabul qilmaydi — xabar shu yerda chiqadi.
          </p>
          <Button variant="primary" type="submit" pending={create.isPending}>
            Markazga yuborish
          </Button>
        </div>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
