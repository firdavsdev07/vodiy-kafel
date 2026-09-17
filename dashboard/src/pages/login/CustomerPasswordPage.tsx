import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { z } from 'zod';
import {
  useActorType,
  useChangeWholesalePassword,
  useHasSession,
  useMustChangePassword,
} from '@/features/auth/hooks';
import { loginErrorMessage } from '@/features/auth/login-error';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { Button } from '@/shared/ui/Button';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/shared/lib/validation';

const MIN_LENGTH = MIN_PASSWORD_LENGTH;

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Joriy parolni kiriting').max(MAX_PASSWORD_LENGTH),
    newPassword: z
      .string()
      .min(MIN_LENGTH, `Kamida ${MIN_LENGTH} belgi`)
      .max(MAX_PASSWORD_LENGTH, `Parol ${MAX_PASSWORD_LENGTH} belgidan oshmasligi kerak`),
    repeat: z.string().min(1, 'Parolni takrorlang'),
  })
  // Backend ham tekshiradi, lekin server javobini kutib o'tirmaymiz
  .refine((v) => v.newPassword !== v.oldPassword, {
    path: ['newPassword'],
    message: 'Yangi parol joriy paroldan farq qilishi kerak',
  })
  .refine((v) => v.newPassword === v.repeat, {
    path: ['repeat'],
    message: 'Parollar mos kelmadi',
  });

type FormValues = z.infer<typeof schema>;

/**
 * Vaqtinchalik parolni almashtirish — birinchi kirishda MAJBURIY (D-050).
 *
 * 🔒 Backend bu holatda boshqa hamma endpointga 403 qaytaradi, shuning
 *    uchun bu ekran chetlab o'tilmaydi — "keyinroq" tugmasi YO'Q.
 */
export default function CustomerPasswordPage() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const navigate = useNavigate();
  const change = useChangeWholesalePassword();
  const needsNewPassword = useMustChangePassword();
  const errorId = useId();
  // Parol almashgach token yangilanadi va bayroq o'chadi — shunda bu
  // sahifa o'zini yopadi. `onSuccess` dagi navigate bilan poyga bo'lmaydi,
  // chunki ikkalasi ham AYNAN bir joyga — `/kabinet` ga olib boradi.
  const [openedForChange] = useState(() => needsNewPassword);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', newPassword: '', repeat: '' },
  });
  const [oldPassword, newPassword, repeat] = useWatch({
    control: form.control,
    name: ['oldPassword', 'newPassword', 'repeat'],
  });

  if (!hasSession) return <Navigate to="/kabinet/kirish" replace />;
  if (actorType !== 'customer') return <Navigate to="/" replace />;
  // Majburiyat yo'q va bu sahifa majburiyat uchun ochilmagan — kerak emas
  if (!needsNewPassword && !openedForChange) return <Navigate to="/kabinet" replace />;

  const onSubmit = form.handleSubmit(({ oldPassword: op, newPassword: np }) =>
    change.mutate(
      { oldPassword: op, newPassword: np },
      { onSuccess: () => navigate('/kabinet', { replace: true }) },
    ),
  );

  const serverError = change.isError ? loginErrorMessage(change.error, 'login') : null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-describedby={serverError ? errorId : undefined}
      className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
    >
      <h1 className="text-lg font-semibold">Yangi parol o‘rnating</h1>

      <p className="mt-3 flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Siz administrator bergan <strong>vaqtinchalik parol</strong> bilan kirdingiz. Davom etish
          uchun uni almashtirish shart.
        </span>
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <PasswordInput
          register={form.register}
          name="oldPassword"
          label="Joriy (vaqtinchalik) parol"
          error={form.formState.errors.oldPassword?.message}
        />
        <PasswordInput
          register={form.register}
          name="newPassword"
          label={`Yangi parol (kamida ${MIN_LENGTH} belgi)`}
          autoComplete="new-password"
          error={form.formState.errors.newPassword?.message}
        />
        <PasswordInput
          register={form.register}
          name="repeat"
          label="Yangi parolni takrorlang"
          autoComplete="new-password"
          error={form.formState.errors.repeat?.message}
        />
      </div>

      <p
        id={errorId}
        role="alert"
        aria-live="assertive"
        className={
          serverError ? 'mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger' : 'sr-only'
        }
      >
        {serverError}
      </p>

      <Button
        type="submit"
        variant="primary"
        pending={change.isPending}
        disabled={!oldPassword || !newPassword || !repeat}
        className="mt-6 h-10 w-full"
      >
        {change.isPending ? 'Saqlanmoqda…' : 'Parolni saqlash'}
      </Button>
    </form>
  );
}
