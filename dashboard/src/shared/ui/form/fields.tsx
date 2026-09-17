import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { formatMoneyInput, parseMoneyInput } from '@/shared/lib/format';
import { controlClass } from './control-class';
import { Field } from './Field';

/**
 * react-hook-form ga ulangan maydonlar (D-008). Hammasi bir xil API:
 *
 *   const form = useForm({ resolver: zodResolver(schema), defaultValues })
 *   <InputField control={form.control} name="name" label="Nomi" required />
 *
 * Xato matni zod sxemasidan (shared/lib/validation.ts), server xatosi —
 * `form.setError('root', ...)` yoki toast.
 */

/**
 * `T` — forma kirish qiymatlari, `TOut` — zod transformdan keyingi (masalan
 * telefon `"90 123…"` → `"+998…"`). `useForm<Input, unknown, Output>` bilan mos.
 */
interface BaseProps<T extends FieldValues, TOut extends FieldValues = T> {
  control: Control<T, unknown, TOut>;
  name: FieldPath<T>;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InputField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  onBlur,
  ...input
}: BaseProps<T, TOut> & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'className'>) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} required={required} className={className}>
      {(a11y) => (
        <input
          {...input}
          {...a11y}
          {...field}
          // react-hook-form'ning onBlur'i (touched) + chaqiruvchiniki — ikkalasi ham
          onBlur={(e) => {
            field.onBlur();
            onBlur?.(e);
          }}
          value={(field.value as string | number | undefined) ?? ''}
          className={controlClass(Boolean(fieldState.error), 'h-9 px-3')}
        />
      )}
    </Field>
  );
}

export function TextareaField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  rows = 3,
  ...textarea
}: BaseProps<T, TOut> & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'value' | 'onChange' | 'className'>) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} required={required} className={className}>
      {(a11y) => (
        <textarea
          {...textarea}
          {...a11y}
          {...field}
          rows={rows}
          value={(field.value as string | undefined) ?? ''}
          className={controlClass(Boolean(fieldState.error), 'px-3 py-2')}
        />
      )}
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function SelectField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  options,
  placeholder = 'Tanlang…',
}: BaseProps<T, TOut> & { options: readonly SelectOption[]; placeholder?: string }) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} required={required} className={className}>
      {(a11y) => (
        <select
          {...a11y}
          {...field}
          value={(field.value as string | undefined) ?? ''}
          className={controlClass(Boolean(fieldState.error), 'h-9 px-2')}
        >
          <option value="" disabled={required}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  disabled,
  className = '',
}: Omit<BaseProps<T, TOut>, 'required'>) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  const { ref, onBlur, onChange, value, disabled: isDisabled } = field;
  const error = fieldState.error?.message;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          ref={ref}
          onBlur={onBlur}
          disabled={isDisabled}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="size-4 rounded-sm accent-accent"
        />
        {label}
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * O'nlik son (G6): ekranda `1 234,5`, formada `"1234.5"` SATR — `Number()`
 * ishlatilmaydi. Tekshiruv — `zDecimal()` / `zMoney()`.
 */
export function DecimalField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  scale,
  suffix,
}: BaseProps<T, TOut> & { scale: number; suffix: string }) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  const { ref, onBlur, disabled: isDisabled } = field;
  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} required={required} className={className}>
      {(a11y) => (
        <div
          className={`${controlClass(Boolean(fieldState.error), 'flex h-9 items-center')} focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus`}
        >
          <input
            {...a11y}
            name={field.name}
            ref={ref}
            onBlur={onBlur}
            disabled={isDisabled}
            inputMode="decimal"
            autoComplete="off"
            value={formatMoneyInput((field.value as string | undefined) ?? '')}
            onChange={(e) => field.onChange(parseMoneyInput(e.target.value, scale))}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-right tabular-nums outline-none"
          />
          <span className="pr-3 text-muted select-none">{suffix}</span>
        </div>
      )}
    </Field>
  );
}

/** Pul maydoni — `DecimalField` so'm bilan. */
export function MoneyField<T extends FieldValues, TOut extends FieldValues = T>({
  scale = 2,
  suffix = 'so‘m',
  ...props
}: BaseProps<T, TOut> & { scale?: number; suffix?: string }) {
  return <DecimalField {...props} scale={scale} suffix={suffix} />;
}

/**
 * Telefon: `+998` prefiks, formada xodim yozgani saqlanadi; `zUzPhone()`
 * uni `+998901234567` ga keltiradi.
 */
export function PhoneField<T extends FieldValues, TOut extends FieldValues = T>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  autoComplete = 'tel-national',
  autoFocus,
}: BaseProps<T, TOut> & { autoComplete?: string; autoFocus?: boolean }) {
  const { field, fieldState } = useController<T, FieldPath<T>, TOut>({ control, name, disabled });
  const { ref, onBlur, disabled: isDisabled } = field;
  const raw = ((field.value as string | undefined) ?? '').replace(/^\+?998/, '');
  return (
    <Field label={label} hint={hint} error={fieldState.error?.message} required={required} className={className}>
      {(a11y) => (
        <div
          className={`${controlClass(Boolean(fieldState.error), 'flex h-9 items-center')} focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus`}
        >
          <span className="pl-3 text-muted select-none">+998</span>
          <input
            {...a11y}
            name={field.name}
            ref={ref}
            onBlur={onBlur}
            disabled={isDisabled}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            placeholder="90 123 45 67"
            maxLength={17}
            value={raw}
            onChange={(e) => field.onChange(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted/60"
          />
        </div>
      )}
    </Field>
  );
}
