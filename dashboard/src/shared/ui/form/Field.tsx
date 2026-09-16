import { useId, type ReactNode } from 'react';

export interface FieldA11y {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

/**
 * Maydon qobig'i (D-008): label, izoh, xato — `id`/`aria-*` bog'lanishi
 * bir joyda. Input `children(a11y)` orqali oladi.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = '',
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (a11y: FieldA11y) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
