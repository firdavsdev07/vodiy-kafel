import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:opacity-90',
  secondary: 'border border-line-strong bg-surface hover:bg-surface-muted',
  // Qizil fon + oq matn dark rejimda o'qilmaydi — soft fon + danger matn ikkala rejimda AA
  danger: 'border border-danger/40 bg-danger-soft text-danger hover:border-danger',
  ghost: 'text-muted hover:bg-surface-muted hover:text-fg',
};

/** Tugma (D-008). `pending` — spinner + disabled: ikki marta bosib ikki so'rov ketmaydi. */
export function Button({
  variant = 'secondary',
  size = 'md',
  pending = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  pending?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-4 text-sm'
      } ${variants[variant]} ${className}`}
      {...rest}
    >
      {pending && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
