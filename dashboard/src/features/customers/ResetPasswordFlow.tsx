import { useState } from 'react';
import { ConfirmDialog, TemporaryPasswordDialog, toast } from '@/shared/ui';
import { useResetCustomerPassword } from './api';

interface Target {
  id: string;
  companyName: string;
}

/**
 * Parolni tiklash oqimi (D-021, D-022): tasdiq → yangi vaqtinchalik parol
 * oynasi. 🔒 Parol faqat shu hook holatida, mutatsiya darhol `reset()`.
 *
 *   const reset = useResetPasswordFlow();
 *   <Button onClick={() => reset.request(customer)}>…</Button>
 *   {reset.element}
 */
export function useResetPasswordFlow() {
  const mutation = useResetCustomerPassword();
  const [target, setTarget] = useState<Target | null>(null);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const confirm = async () => {
    if (!target || mutation.isPending) return;
    try {
      const result = await mutation.mutateAsync(target.id);
      mutation.reset();
      setTarget(null);
      // 2026-09-18: mijoz TELEFON bilan kiradi — `TemporaryPasswordDialog`
      // prop shakli generik ("login" — kiritiladigan identifikator degani).
      if (result) setCredentials({ login: result.phone, password: result.temporaryPassword });
    } catch (error) {
      mutation.reset();
      toast.error(error);
    }
  };

  const element = (
    <>
      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`“${target?.companyName ?? ''}” uchun yangi parol?`}
        description="Eski parol ishlamay qoladi. Mijoz yangi vaqtinchalik parol bilan kirib, uni almashtiradi."
        confirmText="Yangi parol berish"
        pending={mutation.isPending}
        onConfirm={() => void confirm()}
      />
      <TemporaryPasswordDialog credentials={credentials} title="Yangi vaqtinchalik parol" onClose={() => setCredentials(null)} />
    </>
  );

  return { request: setTarget, element };
}
