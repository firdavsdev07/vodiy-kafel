import { MapPin, Phone, Send } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Schema } from '@/shared/api';
import { formatUzPhone } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui';

type Contact = Schema<'ManagerContactDto'>;

/**
 * «Menejer bilan aloqa» (D-056, T-006) — kabinetdagi YAGONA ko'rinish:
 * buyurtma sahifasida ham, "Hisobim" da ham shu karta.
 *
 * ⚠ Avval ma'lumot tugma ortida edi va menejer biriktirilmagan bo'lsa
 *   faqat xato (404) chiqardi. Endi darhol yuklanadi; menejer bo'lmasa —
 *   filial aloqasi (u DOIM bor), mijoz hech qachon bo'sh kartaga qaramaydi.
 */
export function ManagerContactCard({
  query,
  title = 'Menejer bilan aloqa',
}: {
  query: UseQueryResult<Contact>;
  title?: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {query.isPending ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <ContactBody contact={query.data} />
      )}
    </section>
  );
}

function ContactBody({ contact }: { contact: Contact }) {
  const { manager, branch } = contact;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {manager ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted">Sizning menejeringiz</p>
          <p className="font-medium">{manager.fullName}</p>
          {manager.phone && (
            <a href={`tel:${manager.phone}`} className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline">
              <Phone size={14} aria-hidden />
              {formatUzPhone(manager.phone)}
            </a>
          )}
          {manager.telegramUrl && (
            <a
              href={manager.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline"
            >
              <Send size={14} aria-hidden />
              Telegram orqali yozish
            </a>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted">
          Sizga hali shaxsiy menejer biriktirilmagan — filialimizga murojaat qiling.
        </p>
      )}

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <p className="text-xs text-muted">Filial</p>
        <p className="font-medium">{branch.name}</p>
        {branch.phones.map((phone) => (
          <a key={phone} href={`tel:${phone}`} className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline">
            <Phone size={14} aria-hidden />
            {formatUzPhone(phone)}
          </a>
        ))}
        {branch.telegramUrl && (
          <a
            href={branch.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline"
          >
            <Send size={14} aria-hidden />
            Telegram
          </a>
        )}
        <p className="inline-flex items-start gap-1.5 text-xs text-muted">
          <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden />
          {branch.address} · {branch.workingHours}
        </p>
      </div>
    </div>
  );
}
