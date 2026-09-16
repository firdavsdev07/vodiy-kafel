import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ProductSearch } from '@/features/products/ProductSearch';
import type { ProductRef } from '@/features/products/similar';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, CheckboxField, Modal, MoneyField, toast } from '@/shared/ui';
import { useUpsertPrice } from './api';
import { zPrice } from './prices';

const schema = z.object({
  product: z.custom<ProductRef | null>().refine((p) => p !== null, 'Mahsulotni tanlang'),
  pricePerSqm: zPrice(),
  isActive: z.boolean(),
});
type Input = z.input<typeof schema>;
type Values = z.output<typeof schema>;

const FORM_ID = 'add-price-form';

/**
 * Filialga mahsulot narxini qo'shish (D-016) — PUT upsert: narx bor bo'lsa
 * YANGILANADI. 🔒 `branch` faqat SUPER_ADMIN uchun beriladi (G5); filial
 * admini uchun narx doim o'z filialiga yoziladi.
 */
export function AddPriceModal({
  open,
  onClose,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  branch?: { id: string; name: string };
}) {
  const upsert = useUpsertPrice();
  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { product: null, pricePerSqm: '', isActive: true },
  });

  const close = () => {
    form.reset();
    upsert.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    if (upsert.isPending || !values.product) return;
    upsert.mutate(
      {
        ...(branch ? { branchId: branch.id } : {}),
        productId: values.product.id,
        pricePerSqm: values.pricePerSqm,
        isActive: values.isActive,
      },
      {
        onSuccess: () => {
          toast.success(`${values.product?.name ?? 'Mahsulot'} narxi saqlandi`);
          close();
        },
        onError: (e) => form.setError('root', { message: errorMessage(e) }),
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!upsert.isPending}
      title="Mahsulot narxini qo‘shish"
      description={
        <>
          {branch ? (
            <>
              Filial: <strong className="text-fg">{branch.name}</strong>.{' '}
            </>
          ) : (
            'O‘z filialingiz uchun. '
          )}
          Bu mahsulotga narx allaqachon bo‘lsa — yangilanadi. Eski buyurtmalar o‘zgarmaydi.
        </>
      }
      footer={
        <>
          <Button onClick={close} disabled={upsert.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={upsert.isPending}>
            Saqlash
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Controller
          control={form.control}
          name="product"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Mahsulot <span className="text-danger" aria-hidden>*</span>
              </span>
              {field.value ? (
                <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{field.value.name}</span>
                  <button type="button" onClick={() => field.onChange(null)} aria-label="Boshqa mahsulot tanlash" className="text-muted hover:text-fg">
                    <X size={15} aria-hidden />
                  </button>
                </div>
              ) : (
                <ProductSearch onPick={field.onChange} pickLabel="Tanlash" />
              )}
              {fieldState.error && <p className="text-xs text-danger">{fieldState.error.message}</p>}
            </div>
          )}
        />
        <MoneyField control={form.control} name="pricePerSqm" label="Narx, 1 m² uchun" required />
        <CheckboxField control={form.control} name="isActive" label="Shu filialda sotiladi" />
        {form.formState.errors.root && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
