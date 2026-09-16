import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useFactories } from '@/features/factories/api';
import { useSizes } from '@/features/sizes/api';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { surfaceLabel } from '@/shared/lib/labels';
import { useUnsavedChanges } from '@/shared/lib/use-unsaved-changes';
import {
  Button,
  DecimalField,
  InputField,
  SelectField,
  TextareaField,
  toast,
  UnsavedChangesDialog,
} from '@/shared/ui';
import { useCreateProduct, useUpdateProduct } from './api';
import {
  changesCalculation,
  productDefaults,
  productSchema,
  toCreateBody,
  toUpdateBody,
  type Product,
  type ProductFormInput,
  type ProductFormValues,
} from './product-form';

const surfaceOptions = (['POL', 'DEVOR'] as const).map((value) => ({ value, label: surfaceLabel[value] }));

/**
 * Mahsulot asosiy ma'lumotlari (D-012) — yaratish ham, tahrirlash ham.
 * `readOnly` — SUPER_ADMIN bo'lmagan xodim: maydonlar o'chiq, saqlash yo'q.
 */
export function ProductForm({
  product,
  readOnly = false,
  onCreated,
}: {
  product?: Product;
  readOnly?: boolean;
  /** Yaratilgandan keyin (odatda kartaga o'tish). Navigatsiya bloklanmaydi. */
  onCreated?: (product: Product) => void;
}) {
  const factories = useFactories();
  const sizes = useSizes();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const pending = create.isPending || update.isPending;

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: productDefaults(product),
  });
  const { isDirty } = form.formState;
  const { blocker, allowNavigation } = useUnsavedChanges(isDirty && !readOnly);
  const [sqm, weight] = useWatch({ control: form.control, name: ['sqmPerPallet', 'weightPerPallet'] });
  const calcWarning = product && changesCalculation({ sqmPerPallet: sqm, weightPerPallet: weight }, product);

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError)) return toast.error(error);
    // 409: "Bu nom va o'lchamdagi mahsulot bor" — nom ostida
    if (error.statusCode === 409) return form.setError('name', { message: errorMessage(error) }, { shouldFocus: true });
    // 400: backend matni ustun (zavod/o'lcham topilmadi, validatsiya)
    if (error.statusCode === 400) return form.setError('root', { message: errorMessage(error) });
    toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending || readOnly) return;
    if (!product) {
      create.mutate(toCreateBody(values), {
        onSuccess: (created) => {
          toast.success(`“${values.name}” qo‘shildi. Endi rasm va narxlarni kiriting.`);
          allowNavigation();
          form.reset(values);
          if (created) onCreated?.(created);
        },
        onError,
      });
      return;
    }
    const body = toUpdateBody(values, product);
    if (Object.keys(body).length === 0) {
      form.reset(productDefaults(product));
      return;
    }
    update.mutate(
      { id: product.id, body },
      {
        onSuccess: (updated) => {
          toast.success('O‘zgarishlar saqlandi');
          form.reset(productDefaults(updated ?? product));
        },
        onError,
      },
    );
  });

  // Tanlangan zavod/o'lcham ro'yxatda bo'lmasa ham (o'chirilgan zavod) ko'rinsin
  const factoryOptions = (factories.data ?? []).map((f) => ({
    value: f.id,
    label: f.isActive ? f.name : `${f.name} (o‘chirilgan)`,
    disabled: !f.isActive && f.id !== product?.factory.id,
  }));
  const sizeOptions = (sizes.data ?? []).map((s) => ({ value: s.id, label: s.label }));

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={pending || undefined} className="flex flex-col gap-6">
      <fieldset disabled={pending || readOnly} className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <InputField control={form.control} name="name" label="Nomi" required maxLength={150} autoComplete="off" className="md:col-span-2"
          hint={product ? <>URL: <code className="font-mono">{product.slug}</code> — nom o‘zgarsa ham o‘zgarmaydi</> : 'URL nomdan avtomatik yasaladi va keyin o‘zgarmaydi'} />
        <SelectField control={form.control} name="factoryId" label="Zavod" required options={factoryOptions}
          placeholder={factories.isPending ? 'Yuklanmoqda…' : 'Tanlang…'} />
        <SelectField control={form.control} name="sizeId" label="O‘lcham" required options={sizeOptions}
          placeholder={sizes.isPending ? 'Yuklanmoqda…' : 'Tanlang…'} />
        <SelectField control={form.control} name="surface" label="Sirt" required options={surfaceOptions} />
        <InputField control={form.control} name="color" label="Rang" maxLength={60} placeholder="Bej" />

        <div className="grid gap-4 rounded-lg border border-line p-4 md:col-span-2 md:grid-cols-2">
          <p className="text-sm font-medium md:col-span-2">Kalkulyator ma’lumotlari</p>
          <DecimalField control={form.control} name="sqmPerPallet" label="1 paddondagi m²" required scale={4} suffix="m²"
            hint="Summa = paddon × m² × m² narxi" />
          <DecimalField control={form.control} name="weightPerPallet" label="1 paddon og‘irligi" required scale={3} suffix="kg"
            hint="Transport soni shu og‘irlikdan hisoblanadi" />
          {calcWarning && (
            <p role="alert" className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning md:col-span-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Bu qiymatlar <strong>yangi buyurtmalar</strong> summasi va transport hisobini o‘zgartiradi. Eski
                buyurtmalar o‘zgarmaydi — ular buyurtma paytidagi qiymatni saqlaydi.
              </span>
            </p>
          )}
        </div>

        <TextareaField control={form.control} name="description" label="Tavsif" maxLength={2000} rows={4} className="md:col-span-2"
          hint={product?.description ? 'Bo‘sh qoldirilsa eski tavsif saqlanadi (backend o‘chirishni qo‘llamaydi).' : undefined} />
      </fieldset>

      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}

      {readOnly ? (
        <p className="text-sm text-muted">Mahsulotni faqat bosh administrator o‘zgartiradi.</p>
      ) : (
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          {isDirty && <span className="mr-auto text-sm text-muted">Saqlanmagan o‘zgarishlar bor</span>}
          {product && (
            <Button onClick={() => form.reset(productDefaults(product))} disabled={!isDirty || pending}>
              Bekor qilish
            </Button>
          )}
          <Button variant="primary" type="submit" pending={pending} disabled={Boolean(product) && !isDirty}>
            {product ? 'Saqlash' : 'Mahsulotni qo‘shish'}
          </Button>
        </div>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
