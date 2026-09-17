import { formatDate, type DateFormat } from '@/shared/lib/format';

/** UTC → Toshkent vaqti (G9). `<time dateTime>` — asl ISO qiymat saqlanadi. */
export function DateText({
  value,
  format = 'datetime',
  className = '',
}: {
  value: string | null | undefined;
  format?: DateFormat;
  className?: string;
}) {
  if (!value) return <span className={`text-muted ${className}`}>—</span>;
  return (
    <time dateTime={value} className={`whitespace-nowrap tabular-nums ${className}`}>
      {formatDate(value, format)}
    </time>
  );
}
