import { zodResolver } from '@hookform/resolvers/zod';
import { ImageUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatBytes, MAX_UPLOAD_BYTES } from '@/features/products/media';
import { ApiError } from '@/shared/api';
import { errorMessage } from '@/shared/lib/error-message';
import { branchTypeLabel } from '@/shared/lib/labels';
import { Button, InputField, Modal, SelectField, TextareaField, Thumb, toast } from '@/shared/ui';
import { useCreateBranch, useUpdateBranch, useUploadBranchImage } from './api';
import {
  branchDefaults,
  branchSchema,
  MAX_PHONES,
  toCreateBranchBody,
  toUpdateBranchBody,
  type Branch,
  type BranchFormInput,
  type BranchFormValues,
} from './branch-form';

const FORM_ID = 'branch-form';

/**
 * Filial yaratish / tahrirlash (D-033). `branch` berilsa — tahrirlash.
 * 🔒 `fullAccess: false` (filial admini, moderator) — faqat kontakt maydonlari
 *    ochiq, qolgani ko'rinadi lekin o'zgarmaydi; so'rovga ham tushmaydi.
 */
export function BranchFormModal({
  open,
  branch,
  fullAccess,
  onClose,
}: {
  open: boolean;
  branch?: Branch;
  fullAccess: boolean;
  onClose: () => void;
}) {
  const create = useCreateBranch();
  const update = useUpdateBranch();
  const pending = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      size="lg"
      title={branch ? `${branch.name} — tahrirlash` : 'Yangi filial'}
      description={
        branch
          ? fullAccess
            ? 'Filial turi (do‘kon / markaziy ombor) keyin o‘zgarmaydi.'
            : 'Siz faqat manzil, ish vaqti, telefon va havolalarni o‘zgartira olasiz.'
          : 'Yangi do‘kon filiali narxlari va tariflari kiritilmaguncha mijozlar undan buyurtma bera olmaydi.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} pending={pending}>
            Saqlash
          </Button>
        </>
      }
    >
      {open && (
        <div className="flex flex-col gap-5">
          {branch && <BranchImage branch={branch} />}
          <BranchForm key={branch?.id ?? 'new'} branch={branch} fullAccess={fullAccess} create={create} update={update} onDone={onClose} />
        </div>
      )}
    </Modal>
  );
}

function BranchForm({
  branch,
  fullAccess,
  create,
  update,
  onDone,
}: {
  branch?: Branch;
  fullAccess: boolean;
  create: ReturnType<typeof useCreateBranch>;
  update: ReturnType<typeof useUpdateBranch>;
  onDone: () => void;
}) {
  const pending = create.isPending || update.isPending;
  const form = useForm<BranchFormInput, unknown, BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: branchDefaults(branch),
  });
  // Filial admini — faqat kontaktlar; tur esa tahrirlashda hech kimga ochiq emas
  const locked = !fullAccess;

  const onError = (error: unknown) => {
    if (error instanceof ApiError && [400, 403, 404].includes(error.statusCode)) {
      form.setError('root', { message: errorMessage(error) });
    } else toast.error(error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (pending) return;
    if (!branch) {
      create.mutate(toCreateBranchBody(values), {
        onSuccess: (created) => {
          toast.success(`“${created.name}” filiali qo‘shildi`);
          onDone();
        },
        onError,
      });
      return;
    }
    const body = toUpdateBranchBody(values, branch, fullAccess);
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: branch.id, body },
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
        <SelectField
          control={form.control}
          name="type"
          label="Turi"
          required
          disabled={Boolean(branch)}
          hint={branch ? 'Keyin o‘zgarmaydi' : 'Markaziy omborda zaxira bor; do‘konda — faqat narx'}
          options={[
            { value: 'RETAIL', label: `${branchTypeLabel.RETAIL} (RETAIL)` },
            { value: 'CENTRAL', label: `${branchTypeLabel.CENTRAL} (CENTRAL)` },
          ]}
        />
        <InputField control={form.control} name="sortOrder" label="Tartib" inputMode="numeric" required disabled={locked} hint="Kichik son — saytda oldinroq" />
        <InputField control={form.control} name="name" label="Nomi" required maxLength={150} disabled={locked} className="sm:col-span-2" />
        <InputField control={form.control} name="city" label="Shahar" required maxLength={100} disabled={locked} />
        <InputField control={form.control} name="workingHours" label="Ish vaqti" required maxLength={100} placeholder="Du–Sh 09:00–18:00" />
        <InputField control={form.control} name="address" label="Manzil" required maxLength={300} className="sm:col-span-2" />
        <InputField control={form.control} name="latitude" label="Kenglik (latitude)" required inputMode="decimal" placeholder="40.3864" />
        <InputField control={form.control} name="longitude" label="Uzunlik (longitude)" required inputMode="decimal" placeholder="71.7864" />
        <TextareaField
          control={form.control}
          name="phones"
          label="Telefonlar"
          required
          rows={3}
          hint={`Har qatorda bitta, ko‘pi bilan ${MAX_PHONES} ta`}
          placeholder="+998 73 244 00 00"
          className="sm:col-span-2"
        />
        <InputField control={form.control} name="telegramUrl" label="Telegram" type="url" placeholder="https://t.me/…" maxLength={300} />
        <InputField control={form.control} name="instagramUrl" label="Instagram" type="url" placeholder="https://instagram.com/…" maxLength={300} />
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {form.formState.errors.root.message}
        </p>
      )}
    </form>
  );
}

/** Bino surati — tahrirlashda (yaratishda filial ID si hali yo'q). */
function BranchImage({ branch }: { branch: Branch }) {
  const upload = useUploadBranchImage();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError(`Fayl ${formatBytes(file.size)} — 10 MB dan katta`);
    if (file.size === 0) return setError('Fayl bo‘sh');
    setProgress(0);
    upload.mutate(
      { id: branch.id, file, onProgress: setProgress },
      {
        onSuccess: () => toast.success('Bino surati yangilandi'),
        onError: (e) => setError(errorMessage(e)),
        onSettled: () => {
          setProgress(null);
          if (input.current) input.current.value = '';
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface-muted px-4 py-3">
      <Thumb src={branch.buildingImageUrl} name={branch.name} size="lg" alt="Bino surati" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-medium">Bino surati</p>
        <p className="text-xs text-muted">JPG, PNG yoki WEBP, 10 MB gacha. Eski surat almashtiriladi.</p>
        {progress !== null && (
          <div className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
      <Button size="sm" onClick={() => input.current?.click()} pending={upload.isPending}>
        <ImageUp size={14} aria-hidden />
        {branch.buildingImageUrl ? 'Almashtirish' : 'Yuklash'}
      </Button>
    </div>
  );
}
