import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ImageFilePicker } from '@/features/products/ImageFilePicker';
import { formatBytes, MAX_UPLOAD_BYTES } from '@/features/products/media';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, CheckboxField, InputField, Modal, Thumb, toast } from '@/shared/ui';
import { useCreatePartner, useUpdatePartner, useUploadPartnerLogo } from './api';
import {
  partnerDefaults,
  partnerSchema,
  toCreatePartnerFields,
  toUpdatePartnerBody,
  type Partner,
  type PartnerFormInput,
  type PartnerFormValues,
} from './partner-form';

const FORM_ID = 'partner-form';

const precheck = (file: File): string | null =>
  file.size > MAX_UPLOAD_BYTES ? `Fayl ${formatBytes(file.size)} — 10 MB dan katta` : file.size === 0 ? 'Fayl bo‘sh' : null;

/**
 * Hamkor qo'shish / tahrirlash (D-034). Yangi hamkorda logotip MAJBURIY va
 * ma'lumot bilan birga yuboriladi; tahrirlashda logotip alohida almashtiriladi.
 */
export function PartnerFormModal({
  open,
  partner,
  nextSortOrder,
  onClose,
}: {
  open: boolean;
  partner?: Partner;
  nextSortOrder: number;
  onClose: () => void;
}) {
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const [progress, setProgress] = useState<number | null>(null);
  const pending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title={partner ? `${partner.name} — tahrirlash` : 'Yangi hamkor'}
      description={partner ? undefined : 'Logotip: JPG, PNG yoki WEBP, 10 MB gacha.'}
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
        <div className="flex flex-col gap-4">
          {partner && <LogoReplace partner={partner} />}
          <PartnerForm
            key={partner?.id ?? 'new'}
            partner={partner}
            nextSortOrder={nextSortOrder}
            create={create}
            update={update}
            onProgress={setProgress}
            onDone={onClose}
          />
        </div>
      )}
    </Modal>
  );
}

function PartnerForm({
  partner,
  nextSortOrder,
  create,
  update,
  onProgress,
  onDone,
}: {
  partner?: Partner;
  nextSortOrder: number;
  create: ReturnType<typeof useCreatePartner>;
  update: ReturnType<typeof useUpdatePartner>;
  onProgress: (p: number | null) => void;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [upload, setUpload] = useState<AbortController | null>(null);
  const fileId = useId();
  const form = useForm<PartnerFormInput, unknown, PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: partnerDefaults(partner, nextSortOrder),
  });

  // Oyna yopilsa — ketayotgan yuklash to'xtaydi
  useEffect(() => () => upload?.abort(), [upload]);

  const onError = (error: unknown) => {
    onProgress(null);
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof ApiError && [400, 404, 413].includes(error.statusCode)) {
      return form.setError('root', { message: errorMessage(error) });
    }
    toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!partner) {
      if (!file) return setFileError('Logotip tanlang');
      const abort = new AbortController();
      setUpload(abort);
      onProgress(0);
      create.mutate(
        { file, fields: toCreatePartnerFields(values), signal: abort.signal, onProgress },
        {
          onSettled: () => setUpload(null),
          onSuccess: (created) => {
            onProgress(null);
            toast.success(`“${created.name}” hamkor qo‘shildi`);
            onDone();
          },
          onError,
        },
      );
      return;
    }
    const body = toUpdatePartnerBody(values, partner);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: partner.id, body },
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
    <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {!partner && (
        <ImageFilePicker
          id={fileId}
          file={file}
          error={fileError}
          disabled={pending}
          onPick={(picked) => {
            if (!picked) return;
            const problem = precheck(picked);
            setFileError(problem);
            if (!problem) setFile(picked);
          }}
          onClear={() => setFile(null)}
        />
      )}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <InputField control={form.control} name="name" label="Nomi" required maxLength={150} />
        <InputField control={form.control} name="sortOrder" label="Tartib" inputMode="numeric" required />
        <InputField control={form.control} name="websiteUrl" label="Sayt" type="url" placeholder="https://…" maxLength={300} className="sm:col-span-2" />
        {partner && <CheckboxField control={form.control} name="isActive" label="Saytda ko‘rinsin" className="sm:col-span-2" />}
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}

/** Logotipni almashtirish — tahrirlashda, ma'lumotdan alohida (backend ham alohida endpoint). */
function LogoReplace({ partner }: { partner: Partner }) {
  const upload = useUploadPartnerLogo();
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const problem = precheck(file);
    setError(problem);
    if (problem) return;
    upload.mutate(
      { id: partner.id, file },
      {
        onSuccess: () => toast.success('Logotip almashtirildi'),
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface-muted px-4 py-3">
      <Thumb src={partner.logoUrl} name={partner.name} size="lg" alt={`${partner.name} logotipi`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">Logotip</p>
        <p className="text-xs text-muted">Yangi fayl tanlansa darhol almashtiriladi.</p>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
      <label htmlFor={id} className={`inline-flex h-8 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-surface-muted ${upload.isPending ? 'pointer-events-none opacity-50' : ''}`}>
        {upload.isPending ? 'Yuklanmoqda…' : 'Almashtirish'}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={upload.isPending}
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
