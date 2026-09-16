import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useHasSession, useLogin } from '@/features/auth/hooks';
import { loginErrorMessage } from '@/features/auth/login-error';
import { zUzPhone } from '@/shared/lib/validation';
import { Button } from '@/shared/ui/Button';
import { controlClass } from '@/shared/ui/form/control-class';
import { Field } from '@/shared/ui/form/Field';
import { PhoneField } from '@/shared/ui/form/fields';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

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
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState | null)?.from ?? '/';
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const errorId = useId();

  const form = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });
  const [phone, password] = useWatch({ control: form.control, name: ['phone', 'password'] });

  if (hasSession && !login.isPending) return <Navigate to={from} replace />;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) }),
  );

  const serverError = login.isError ? loginErrorMessage(login.error) : null;
  const passwordField = form.register('password');

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-contrast">
            VK
          </span>
          <span className="text-md font-semibold tracking-tight">Vodiy Kafel</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <form
          noValidate
          onSubmit={onSubmit}
          aria-describedby={serverError ? errorId : undefined}
          className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
        >
          <h1 className="text-lg font-semibold">Boshqaruv paneliga kirish</h1>
          <p className="mt-1 text-sm text-muted">Xodimlar uchun. Optom mijozlar — saytdagi kabinet.</p>

          <div className="mt-6 flex flex-col gap-4">
            <PhoneField
              control={form.control}
              name="phone"
              label="Telefon raqami"
              autoComplete="username"
              autoFocus
            />

            <Field label="Parol" error={form.formState.errors.password?.message}>
              {(a11y) => (
                <div
                  className={`${controlClass(Boolean(form.formState.errors.password), 'flex h-9 items-center')} focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus`}
                >
                  <input
                    {...a11y}
                    {...passwordField}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={72}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    aria-pressed={showPassword}
                    className="flex h-full w-10 items-center justify-center text-muted hover:text-fg"
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                </div>
              )}
            </Field>
          </div>

          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className={serverError ? 'mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger' : 'sr-only'}
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
        </form>
      </main>
    </div>
  );
}
