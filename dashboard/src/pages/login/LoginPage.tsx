import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useActorType, useHasSession, useLogin } from '@/features/auth/hooks';
import { loginErrorMessage } from '@/features/auth/login-error';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { zUzPhone } from '@/shared/lib/validation';
import { Button } from '@/shared/ui/Button';
import { PhoneField } from '@/shared/ui/form/fields';

interface LocationState {
  from?: string;
}

const loginSchema = z.object({
  phone: zUzPhone(),
  password: z.string().min(1, 'Parolni kiriting').max(72),
});

type LoginInput = z.input<typeof loginSchema>;
type LoginValues = z.output<typeof loginSchema>;

/** Xodim kirishi — `POST /auth/admin/login` (D-006). Forma — react-hook-form + zod (D-008). */
export default function LoginPage() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState | null)?.from ?? '/';
  const login = useLogin();
  const errorId = useId();

  const form = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });
  const [phone, password] = useWatch({ control: form.control, name: ['phone', 'password'] });

  // Mijoz shu sahifaga tushib qolsa — uni kabinetiga qaytaramiz (D-049)
  if (hasSession && actorType === 'customer') return <Navigate to="/kabinet" replace />;
  if (hasSession && !login.isPending) return <Navigate to={from} replace />;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) }),
  );

  const serverError = login.isError ? loginErrorMessage(login.error, 'phone') : null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-describedby={serverError ? errorId : undefined}
      className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
    >
      <h1 className="text-lg font-semibold">Boshqaruv paneliga kirish</h1>
      <p className="mt-1 text-sm text-muted">Xodimlar uchun — telefon raqami bilan.</p>

      <div className="mt-6 flex flex-col gap-4">
        <PhoneField
          control={form.control}
          name="phone"
          label="Telefon raqami"
          autoComplete="username"
          autoFocus
        />

        <PasswordInput
          register={form.register}
          name="password"
          error={form.formState.errors.password?.message}
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
        pending={login.isPending}
        disabled={!phone || !password}
        className="mt-6 h-10 w-full"
      >
        {login.isPending ? 'Kirilmoqda…' : 'Kirish'}
      </Button>

      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-muted">
        Optom mijozmisiz?{' '}
        <Link to="/kabinet/kirish" className="font-medium text-fg underline underline-offset-2">
          Kabinetga kirish
        </Link>
      </p>
    </form>
  );
}
