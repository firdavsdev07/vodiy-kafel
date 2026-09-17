import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FieldPath, FieldValues, UseFormRegister } from 'react-hook-form';
import { controlClass } from '@/shared/ui/form/control-class';
import { Field } from '@/shared/ui/form/Field';

/**
 * Parol maydoni — ko'rsatish/yashirish tugmasi bilan (D-049).
 *
 * Xodim (`/login`) va optom mijoz (`/kabinet/kirish`) kirish sahifalarida
 * bir xil ishlatiladi. `maxLength={72}` — bcrypt shu chegaradan keyingi
 * belgilarni e'tiborga olmaydi, backend DTO'si ham shunday cheklaydi.
 */
export function PasswordInput<T extends FieldValues>({
  register,
  name,
  label = 'Parol',
  error,
  autoComplete = 'current-password',
}: {
  register: UseFormRegister<T>;
  name: FieldPath<T>;
  label?: string;
  error?: string;
  autoComplete?: 'current-password' | 'new-password';
}) {
  const [show, setShow] = useState(false);
  const field = register(name);

  return (
    <Field label={label} error={error}>
      {(a11y) => (
        <div
          className={`${controlClass(Boolean(error), 'flex h-9 items-center')} focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus`}
        >
          <input
            {...a11y}
            {...field}
            type={show ? 'text' : 'password'}
            autoComplete={autoComplete}
            maxLength={72}
            className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            aria-pressed={show}
            className="flex h-full w-10 items-center justify-center text-muted hover:text-fg"
          >
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  );
}
