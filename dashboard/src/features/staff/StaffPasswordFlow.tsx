import { zodResolver } from '@hookform/resolvers/zod';
import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { errorMessage } from '@/shared/lib/error-message';
import { MIN_PASSWORD_LENGTH, zOptionalPassword } from '@/shared/lib/validation';
import { Button, Modal, TemporaryPasswordDialog } from '@/shared/ui';
import type { ResetStaffPasswordBody, Staff, StaffPasswordReset } from './staff-form';

export type ResetPasswordMutation = UseMutationResult<
  StaffPasswordReset,
  Error,
  { id: string; body: ResetStaffPasswordBody }
>;

const schema = z.object({ password: zOptionalPassword() });
type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

/**
 * Xodimga yangi parol berish oqimi (api B-066): forma → bir marta
 * ko'rsatiladigan parol oynasi.
 *
 * ⚠ NEGA KERAK EDI: xodim parolini o'zi almashtira olmaydi (majburiy
 *   almashtirish oqimi faqat optom mijozda bor). B-066 gacha parolni
 *   unutgan menejer/moderator bilan hech narsa qilib bo'lmasdi.
 *
 * ⚠ Admin parolni O'ZI yozishi mumkin (mijoz talabi 2026-09-18) — bo'sh
 *   qoldirsa tizim yaratadi. Ikki holatda ham natija bitta oynada
 *   ko'rsatiladi: "nusxa oling va xodimga yetkazing".
 *
 * 🔒 Parol faqat SHU hook holatida yashaydi: keshga (`gcTime: 0`),
 *    log'ga, URL'ga tushmaydi; oyna yopilganda o'chadi.
 *
 *   const flow = useStaffPasswordFlow(resetMutation);
 *   <IconButton onClick={() => flow.request(staff)} … />
 *   {flow.element}
 */
export function useStaffPasswordFlow(mutation: ResetPasswordMutation) {
  const [target, setTarget] = useState<Staff | null>(null);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const close = () => {
    mutation.reset();
    setTarget(null);
  };

  const element = (
    <>
      <Modal
        open={target !== null}
        onClose={close}
        dismissible={!mutation.isPending}
        size="sm"
        title={target ? `${target.fullName} — yangi parol` : ''}
        description="Parolni o‘zingiz yozishingiz yoki tizimga yaratishga qo‘yishingiz mumkin."
      >
        {target && (
          <PasswordForm
            key={target.id}
            staff={target}
            mutation={mutation}
            onDone={(result) => {
              setTarget(null);
              mutation.reset();
              setCredentials({ login: result.phone, password: result.password });
            }}
            onCancel={close}
          />
        )}
      </Modal>

      <TemporaryPasswordDialog
        credentials={credentials}
        title="Yangi parol — faqat bir marta ko‘rsatiladi"
        note="Uni xodimga shaxsan yetkazing. ⚠ Xodim keyin parolni o‘zi almashtira olmaydi — kerak bo‘lsa yana shu yerdan yangisini berasiz."
        confirmLabel="Parolni saqladim / xodimga yetkazdim"
        onClose={() => setCredentials(null)}
      />
    </>
  );

  return { request: setTarget, element };
}

function PasswordForm({
  staff,
  mutation,
  onDone,
  onCancel,
}: {
  staff: Staff;
  mutation: ResetPasswordMutation;
  onDone: (result: StaffPasswordReset) => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (mutation.isPending) return;
    mutation.mutate(
      { id: staff.id, body: values.password ? { password: values.password } : {} },
      { onSuccess: onDone },
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={mutation.isPending} className="flex flex-col gap-2">
        <PasswordInput
          register={form.register}
          name="password"
          label="Yangi parol (ixtiyoriy)"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
        />
        <p className="text-xs text-muted">
          Bo‘sh qoldirilsa — tizim tasodifiy parol yaratadi. Kamida {MIN_PASSWORD_LENGTH} belgi.
        </p>
      </fieldset>

      {/* ⚠ Xodim qo'lidagi access token 15 daqiqa amal qiladi — backend izohi */}
      <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
        Eski parol darhol ishlamay qoladi. Xodim ochiq turgan seansi bilan yana 15 daqiqagacha
        ishlashi mumkin.
      </p>

      {mutation.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm whitespace-pre-line text-danger">
          {errorMessage(mutation.error)}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} disabled={mutation.isPending}>
          Bekor qilish
        </Button>
        <Button variant="primary" type="submit" pending={mutation.isPending}>
          Parolni o‘rnatish
        </Button>
      </div>
    </form>
  );
}
