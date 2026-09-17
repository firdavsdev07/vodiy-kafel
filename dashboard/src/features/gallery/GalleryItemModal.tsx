import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ProductSearch } from '@/features/products/ProductSearch';
import { ImageFilePicker } from '@/features/products/ImageFilePicker';
import { formatBytes, MAX_UPLOAD_BYTES } from '@/features/products/media';
import { ApiError } from '@/shared/api';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, CheckboxField, InputField, Modal, toast } from '@/shared/ui';
import { useCreateGalleryItem, useUpdateGalleryItem } from './api';
import {
  galleryDefaults,
  galleryMetaSchema,
  toCreateFields,
  toUpdateBody,
  type GalleryFormInput,
  type GalleryFormValues,
  type GalleryItem,
} from './gallery-form';

const FORM_ID = 'gallery-form';

/** Galereyaga rasm qo'shish yoki yozuvni tahrirlash (D-015). */
export function GalleryItemModal({ open, item, onClose }: { open: boolean; item?: GalleryItem; onClose: () => void }) {
  const create = useCreateGalleryItem();
  const update = useUpdateGalleryItem();
  const [progress, setProgress] = useState<number | null>(null);
  const pending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title={item ? 'Galereya rasmini tahrirlash' : 'Galereyaga rasm qo‘shish'}
      description={item ? 'Rasmning o‘zi almashtirilmaydi — yangi rasm uchun yangi yozuv qo‘shing.' : 'JPG, PNG yoki WEBP, 10 MB gacha.'}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={pending}>
            {pending && progress !== null ? `Yuklanmoqda ${Math.round(progress * 100)}%` : 'Saqlash'}
          </Button>
        </>
      }
    >
      {open && (
        <GalleryForm key={item?.id ?? 'new'} item={item} create={create} update={update} onProgress={setProgress} onDone={onClose} />
      )}
    </Modal>
  );
}

function GalleryForm({
  item,
  create,
  update,
  onProgress,
  onDone,
}: {
  item?: GalleryItem;
  create: ReturnType<typeof useCreateGalleryItem>;
  update: ReturnType<typeof useUpdateGalleryItem>;
  onProgress: (p: number | null) => void;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Forma (modal) yopilsa — ketayotgan yuklash to'xtaydi. Controller har yuborishda yangi:
  // StrictMode effektni ikki marta ishga tushiradi — oldindan yaratilgani darhol bekor bo'lardi
  const [upload, setUpload] = useState<AbortController | null>(null);
  const ids = { file: useId() };

  const form = useForm<GalleryFormInput, unknown, GalleryFormValues>({
    resolver: zodResolver(galleryMetaSchema),
    defaultValues: galleryDefaults(item),
  });

  useEffect(() => () => upload?.abort(), [upload]);

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_UPLOAD_BYTES) return setFileError(`Fayl ${formatBytes(picked.size)} — 10 MB dan katta`);
    setFileError(null);
    setFile(picked);
  };

  const onError = (error: unknown) => {
    onProgress(null);
    if (error instanceof DOMException && error.name === 'AbortError') return;
    // 400: fayl mazmuni rasm emas / mahsulot topilmadi — backend matni forma ichida
    if (error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 413)) {
      return form.setError('root', { message: errorMessage(error) });
    }
    toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!item) {
      if (!file) return setFileError('Rasm tanlang');
      const abort = new AbortController();
      setUpload(abort);
      onProgress(0);
      create.mutate(
        { file, fields: toCreateFields(values), signal: abort.signal, onProgress },
        {
          // Tugagan so'rovni keyin "bekor qilish" hech narsa qilmaydi — faqat holat tozalanadi
          onSettled: () => setUpload(null),
          onSuccess: () => {
            onProgress(null);
            toast.success('Rasm galereyaga qo‘shildi');
            onDone();
          },
          onError,
        },
      );
      return;
    }
    const body = toUpdateBody(values, item);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: item.id, body },
      {
        onSuccess: () => {
          toast.success('O‘zgarishlar saqlandi');
          onDone();
        },
        onError,
      },
    );
  });

  const preview = item ? resolveAssetUrl(item.imageUrl) : undefined;

  return (
    <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {item ? (
        <img src={preview} alt="" className="max-h-56 w-full rounded-md bg-surface-muted object-contain" />
      ) : (
        <ImageFilePicker id={ids.file} file={file} error={fileError} disabled={pending} onPick={pickFile} onClear={() => setFile(null)} />
      )}

      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <InputField control={form.control} name="title" label="Sarlavha" maxLength={200} placeholder="Masalan: Farg‘ona, mehmonxona zali" />
        <InputField control={form.control} name="sortOrder" label="Tartib" inputMode="numeric" required />

        <Controller
          control={form.control}
          name="product"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Rasmdagi mahsulot</span>
              {field.value ? (
                <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                  <span className={`min-w-0 flex-1 truncate ${field.value.isActive ? '' : 'text-muted'}`}>{field.value.name}</span>
                  {!field.value.isActive && <Badge tone="neutral">O‘chirilgan</Badge>}
                  <button
                    type="button"
                    onClick={() => field.onChange(null)}
                    aria-label="Mahsulot bog‘lanishini olib tashlash"
                    className="rounded-sm text-muted hover:text-fg"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
              ) : (
                <ProductSearch onPick={field.onChange} pickLabel="Tanlash" placeholder="Ixtiyoriy — mahsulot qidiring…" />
              )}
            </div>
          )}
        />

        {item && <CheckboxField control={form.control} name="isActive" label="Ochiq galereyada ko‘rinsin" className="sm:col-span-2" />}
      </fieldset>

      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}
