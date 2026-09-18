import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
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

/**
 * YAGONA kirish sahifasi (2026-09-18, mijoz talabi) — `POST /auth/login`.
 * Telefon + parol: xodim ham, optom (B2B) mijoz ham AYNAN shu formadan
 * kiradi. Kim ekanini javobdagi `actorType` aytadi va shunga qarab
 * yo'naltiriladi.
 *
 * ⚠ TARIX: avval ikkita alohida sahifa bor edi — `/login` (xodim,
 *   telefon) va `/kabinet/kirish` (mijoz, login satri). Mijoz buni
 *   chalkash topdi ("nega optom mijoz ham telefon bilan, bitta
 *   sahifadan kirmaydi?") va aynan shu ikkalasini birlashtirishni
 *   so'radi — texnik to'siq yo'q edi, faqat oldingi qaror shunday edi.
 */
export default function LoginPage() {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const navigate = useNavigate();
  const from = (useLocation().state as LocationState | null)?.from;
  const login = useLogin();
  const errorId = useId();

  // ⚠ POYGA: `login()` tokenni `onSuccess` dan OLDIN saqlaydi — jonli
  //   `hasSession`/`actorType` ga qarasak, forma hali submit paytida ham
  //   "allaqachon kirgan" deb o'zini yo'naltirib yuborishi mumkin edi.
  //   MOUNT paytidagi holat olinadi: "bu sahifa ochilganda kim edim?".
  const [already] = useState(() => ({ signedIn: hasSession, actorType }));

  const form = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });
  const [phone, password] = useWatch({ control: form.control, name: ['phone', 'password'] });

  if (already.signedIn) {
    // Allaqachon kirgan — realmiga mos joyga (kabinet vs xodim paneli).
    const dest =
      already.actorType === 'customer' ? '/kabinet' : (from ?? '/');
    return <Navigate to={dest} replace />;
  }

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ actorType: who, mustChangePassword }) => {
        if (who === 'CUSTOMER') {
          // Vaqtinchalik parol — boshqa hamma joy backendda 403 (D-050)
          const dest = mustChangePassword
            ? '/kabinet/parol'
            : from?.startsWith('/kabinet')
              ? from
              : '/kabinet';
          navigate(dest, { replace: true });
          return;
        }
        // Xodim — mijoz uchun mo'ljallangan `from` ga tushib qolmasin
        navigate(from && !from.startsWith('/kabinet') ? from : '/', { replace: true });
      },
    }),
  );

  const serverError = login.isError ? loginErrorMessage(login.error, 'phone') : null;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-describedby={serverError ? errorId : undefined}
      className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-md"
    >
      <h1 className="text-lg font-semibold">Vodiy Kafelga kirish</h1>
      <p className="mt-1 text-sm text-muted">
        Telefon raqami va parol bilan — xodim ham, optom mijoz ham shu yerdan.
      </p>

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
    </form>
  );
}
