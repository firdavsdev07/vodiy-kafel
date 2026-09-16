import { formatMoney } from '@/shared/lib/format';

/**
 * API puli (`"85000.00"`) → `85 000 so‘m` (G6). `null` — `—`.
 * Raqamlar jadvalda ustun bo'lib tursin: tabular-nums (body'da tnum bor).
 */
export function MoneyText({
  value,
  currency = true,
  className = '',
}: {
  value: string | null | undefined;
  currency?: boolean;
  className?: string;
}) {
  if (value == null || value === '') return <span className={`text-muted ${className}`}>—</span>;
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {formatMoney(value, { currency })}
    </span>
  );
}
