import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useHasSession, useLogin } from '@/features/auth/hooks';
import { loginErrorMessage } from '@/features/auth/login-error';
import { normalizeUzPhone } from '@/shared/auth';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

interface LocationState {
  from?: string;
}

/**
 * Xodim kirishi — `POST /auth/admin/login` (D-006). Optom mijoz formasi EMAS.
 * ⚠ D-008 da react-hook-form + zod ga o'tkaziladi.
 */
export default function LoginPage() {
  const hasSession = useHasSession();
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState | null)?.from ?? '/';
  const login = useLogin();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const ids = { phone: useId(), password: useId(), error: useId() };

  if (hasSession && !login.isPending) return <Navigate to={from} replace />;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUzPhone(phone);
    if (!normalized) {
      setPhoneError('Raqamni to‘liq kiriting: 90 123 45 67');
      return;
    }
    setPhoneError(null);
    login.mutate(
      { phone: normalized, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    );
  }

  const serverError = login.isError ? loginErrorMessage(login.error) : null;

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
          aria-describedby={serverError ? ids.error : undefined}
          className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
        >
          <h1 className="text-lg font-semibold">Boshqaruv paneliga kirish</h1>
          <p className="mt-1 text-sm text-muted">Xodimlar uchun. Optom mijozlar — saytdagi kabinet.</p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.phone} className="text-sm font-medium">
                Telefon raqami
              </label>
              <div
                className={`flex h-10 items-center rounded-md border bg-surface focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus ${
                  phoneError ? 'border-danger' : 'border-line-strong'
                }`}
              >
                <span className="pl-3 text-muted select-none">+998</span>
                <input
                  id={ids.phone}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="90 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={phoneError ? true : undefined}
                  aria-describedby={phoneError ? `${ids.phone}-err` : undefined}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted/60"
                />
              </div>
              {phoneError && (
                <p id={`${ids.phone}-err`} className="text-xs text-danger">
                  {phoneError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.password} className="text-sm font-medium">
                Parol
              </label>
              <div className="flex h-10 items-center rounded-md border border-line-strong bg-surface focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus">
                <input
                  id={ids.password}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>
          </div>

          <p
            id={ids.error}
            role="alert"
            aria-live="assertive"
            className={serverError ? 'mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger' : 'sr-only'}
          >
            {serverError}
          </p>

          <button
            type="submit"
            disabled={login.isPending || !phone || !password}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {login.isPending && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
            {login.isPending ? 'Kirilmoqda…' : 'Kirish'}
          </button>
        </form>
      </main>
    </div>
  );
}
