import { balanceKind, formatMoney } from '@/shared/lib/format';

/**
 * Mijoz balansi (D-020, G6): musbat — QARZ (qizil), manfiy — AVANS (yashil).
 * Rang yagona signal emas — so'z ham yoziladi.
 */
export function BalanceText({ value }: { value: string }) {
  const kind = balanceKind(value);
  if (kind === 'zero') return <span className="text-muted tabular-nums">{formatMoney('0')}</span>;
  const abs = value.trim().replace(/^-/, '');
  return (
    <span className={`inline-flex flex-col items-end leading-tight ${kind === 'debt' ? 'text-danger' : 'text-success'}`}>
      <span className="font-medium whitespace-nowrap tabular-nums">{formatMoney(abs)}</span>
      <span className="text-xs">{kind === 'debt' ? 'qarz' : 'avans'}</span>
    </span>
  );
}
