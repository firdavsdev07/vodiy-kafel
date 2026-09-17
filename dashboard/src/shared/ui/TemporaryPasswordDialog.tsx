import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Bir marta ko'rsatiladigan parol (D-021 mijoz; D-035/D-061 xodim).
 *
 * ⚠ `note` — KIMGA va NIMA deyilishi oqimga qarab boshqa. Mijoz birinchi
 *   kirishda parolni almashtirishga majbur, XODIM esa emas
 *   (`mustChangePassword` faqat `Customer` da bor) — shuning uchun matn
 *   props'dan keladi, aks holda xodimga yolg'on aytilardi.
 * 🔒 Parol faqat shu komponent props'ida yashaydi: log'ga, localStorage'ga,
 * URL'ga, TanStack keshiga tushmaydi. Yopish — "saqladim" belgisidan keyin;
 * Esc va fon bosish yopmaydi (tasodifan yo'qotib qo'ymaslik uchun).
 */
export function TemporaryPasswordDialog({
  credentials,
  title,
  note,
  confirmLabel = 'Parolni saqladim / mijozga yetkazdim',
  onClose,
}: {
  credentials: { login: string; password: string } | null;
  title: string;
  /** Ogohlantirish matni. Standarti — optom mijoz oqimi (D-021). */
  note?: ReactNode;
  confirmLabel?: string;
  onClose: () => void;
}) {
  return (
    <Modal open={Boolean(credentials)} onClose={onClose} dismissible={false} size="sm" title={title}>
      {credentials && (
        <PasswordBody
          key={credentials.password}
          credentials={credentials}
          note={note}
          confirmLabel={confirmLabel}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function PasswordBody({
  credentials,
  note,
  confirmLabel,
  onClose,
}: {
  credentials: { login: string; password: string };
  note: ReactNode;
  confirmLabel: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<'password' | 'both' | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const copy = async (text: string, what: 'password' | 'both') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong>Bu oyna yopilgach parol qayta ko‘rsatilmaydi.</strong>{' '}
          {note ?? 'Uni hozir mijozga telefon yoki Telegram orqali yetkazing. Mijoz birinchi kirishda parolni almashtiradi.'}
        </span>
      </p>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-xs text-muted">Login</dt>
          <dd className="font-mono text-md select-all">{credentials.login}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Parol</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span
              className="rounded-md border border-line-strong bg-surface-muted px-3 py-2 font-mono text-xl tracking-wider select-all"
              aria-label={`Parol: ${credentials.password.split('').join(' ')}`}
            >
              {credentials.password}
            </span>
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy(credentials.password, 'password')}>
          {copied === 'password' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied === 'password' ? 'Nusxa olindi' : 'Parolni nusxalash'}
        </Button>
        <Button onClick={() => void copy(`Login: ${credentials.login}\nParol: ${credentials.password}`, 'both')}>
          {copied === 'both' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied === 'both' ? 'Nusxa olindi' : 'Login + parol'}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? 'Nusxa olindi' : ''}
      </span>

      <label className="flex items-center gap-2 border-t border-line pt-4 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-accent" />
        {confirmLabel}
      </label>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose} disabled={!confirmed}>
          Yopish
        </Button>
      </div>
    </div>
  );
}
