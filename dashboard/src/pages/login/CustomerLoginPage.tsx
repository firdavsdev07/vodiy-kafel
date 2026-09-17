import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useActorType, useHasSession, useLoginWholesale } from '@/features/auth/hooks';
import { loginErrorMessage } from '@/features/auth/login-error';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { Button } from '@/shared/ui/Button';
import { controlClass } from '@/shared/ui/form/control-class';
import { Field } from '@/shared/ui/form/Field';

interface LocationState {
  from?: string;
}

/**
 * ⚠ Login — TELEFON EMAS, satr (masalan `fargona-optom`).
 *   Backend uni kichik harfga keltirib qidiradi, ya'ni katta-kichik harf
 *   farq qilmaydi. Shu sababli bu yerda ham `toLowerCase()` qilinadi —
 *   foydalanuvchi kiritganini o'zgartirmaydi, lekin yuborilishi bir xil.
 *   `maxLength` 64 — backend DTO'sidagi chegara.
 */
const schema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Loginni kiriting')
    .max(64, 'Login 64 belgidan oshmasligi kerak')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Parolni kiriting').max(72),
});

type LoginInput = z.input<typeof schema>;
type LoginValues = z.output<typeof schema>;

/** Optom (B2B) mijoz kirishi — `POST /auth/wholesale/login` (D-049). */
export default function CustomerLoginPage() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState | null)?.from ?? '/kabinet';
  const login = useLoginWholesale();
  const errorId = useId();

  const form = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '' },
  });
  const [loginValue, password] = useWatch({ control: form.control, name: ['login', 'password'] });

  // ⚠ POYGA: `loginWholesale` tokenni DARHOL saqlaydi, ya'ni `hasSession`
  //   mutatsiyaning `onSuccess` idan OLDIN `true` bo'ladi. Agar shu yerda
  //   jonli `hasSession` ga qarasak, komponent `onSuccess` ulgurmasidan
  //   `from` ga yo'naltirib yuboradi — va vaqtinchalik parol ekrani
  //   (D-050) butunlay chetlab o'tiladi.
  //   Shuning uchun MOUNT paytidagi holat olinadi: "bu sahifa ochilganda
  //   mijoz allaqachon kirganmidi?".
  const [alreadySignedIn] = useState(() => hasSession && actorType === 'customer');

  // Xodim shu sahifaga tushib qolsa — uni o'z paneliga qaytaramiz
  if (hasSession && actorType === 'staff') return <Navigate to="/" replace />;
  if (alreadySignedIn) return <Navigate to={from} replace />;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ mustChangePassword }) => {
        // Vaqtinchalik parol — boshqa hamma joy backendda 403 (D-050)
        navigate(mustChangePassword ? '/kabinet/parol' : from, { replace: true });
      },
    }),
  );

  const serverError = login.isError ? loginErrorMessage(login.error, 'login') : null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-describedby={serverError ? errorId : undefined}
      className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
    >
      <h1 className="text-lg font-semibold">Optom mijoz kabineti</h1>
      <p className="mt-1 text-sm text-muted">
        Login va parolni filial administratori beradi — o‘zingiz ro‘yxatdan o‘tolmaysiz.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Login" error={form.formState.errors.login?.message}>
          {(a11y) => (
            <input
              {...a11y}
              {...form.register('login')}
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
              placeholder="fargona-optom"
              autoFocus
              className={controlClass(Boolean(form.formState.errors.login), 'h-9 w-full px-3')}
            />
          )}
        </Field>

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
        disabled={!loginValue || !password}
        className="mt-6 h-10 w-full"
      >
        {login.isPending ? 'Kirilmoqda…' : 'Kirish'}
      </Button>

      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-muted">
        Xodimmisiz?{' '}
        <Link to="/login" className="font-medium text-fg underline underline-offset-2">
          Boshqaruv paneliga kirish
        </Link>
      </p>
    </form>
  );
}
