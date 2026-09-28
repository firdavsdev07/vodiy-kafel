import { ExternalLink } from 'lucide-react';
import { useBackupStatus, useRunBackup, type BackupStatus } from '@/features/backup/api';
import { Badge, Button, DateText, ErrorState, Spinner, toast } from '@/shared/ui';

const PROVIDER_LABEL: Record<BackupStatus['provider'], string> = {
  off: 'O‘chirilgan',
  file: 'Serverdagi CSV fayllar',
  google: 'Google Sheets',
};

/**
 * «Zaxira nusxa» (T-018) — bazadagi barcha jadvallar Google Sheets'ga
 * (yoki CSV'ga) davriy ko'chiriladi. Sozlash `.env` da (serverda), bu
 * yerda — faqat holat va «Hozir yuborish». 🔒 Faqat SUPER_ADMIN.
 */
export function BackupSection() {
  const status = useBackupStatus();
  const run = useRunBackup();

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Zaxira nusxa</h2>
          <p className="mt-1 text-sm text-muted">
            Bazadagi barcha ma’lumotlar (mijozlar, buyurtmalar, to‘lovlar, mahsulotlar…) muntazam ravishda alohida jadvalga
            ko‘chiriladi — baza ishlamay qolsa ham ma’lumot yo‘qolmaydi. Parollar ko‘chirilmaydi.
          </p>
        </div>
        {status.data && <StateBadge status={status.data} />}
      </div>

      <div className="mt-4">
        {status.isPending ? (
          <Spinner label="Holat yuklanmoqda" className="text-muted" />
        ) : status.error ? (
          <ErrorState error={status.error} onRetry={() => void status.refetch()} retrying={status.isFetching} />
        ) : (
          <Details status={status.data} />
        )}
      </div>

      {status.data?.enabled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            pending={run.isPending}
            onClick={() =>
              run.mutate(undefined, {
                onSuccess: (s) =>
                  s.lastResult === 'FAILED'
                    ? toast.error(`Nusxa olinmadi: ${s.lastError ?? 'noma’lum xato'}`)
                    : toast.success('Zaxira nusxa yangilandi'),
                onError: (error) => toast.error(error),
              })
            }
          >
            Hozir yuborish
          </Button>
          <span className="text-xs text-muted">Avtomatik — har {status.data.intervalMinutes} daqiqada</span>
        </div>
      )}
    </section>
  );
}

function StateBadge({ status }: { status: BackupStatus }) {
  if (!status.enabled) return <Badge tone="neutral">O‘chirilgan</Badge>;
  if (status.running) return <Badge tone="info">Yuborilmoqda…</Badge>;
  if (status.lastResult === 'FAILED') return <Badge tone="danger">Xato</Badge>;
  if (status.lastSuccessAt) return <Badge tone="success">Ishlayapti</Badge>;
  return <Badge tone="neutral">Birinchi nusxa kutilmoqda</Badge>;
}

function Details({ status }: { status: BackupStatus }) {
  if (!status.enabled) {
    return (
      <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
        Zaxira nusxa yoqilmagan. Serverdagi <code className="font-mono">.env</code> faylida{' '}
        <code className="font-mono">BACKUP_PROVIDER=google</code> va Google kalitlarini qo‘yish kerak (ko‘rsatma —{' '}
        <code className="font-mono">api/.env.example</code>).
      </p>
    );
  }

  const rows = status.tables.reduce((sum, t) => sum + t.rows, 0);
  const isLink = status.target?.startsWith('https://');

  return (
    <div className="flex flex-col gap-3 text-sm">
      {status.lastResult === 'FAILED' && status.lastError && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-danger">{status.lastError}</p>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted">Qayerga</dt>
        <dd className="min-w-0 break-all">
          {PROVIDER_LABEL[status.provider]}
          {status.target &&
            (isLink ? (
              <a href={status.target} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2">
                Jadvalni ochish <ExternalLink size={13} aria-hidden />
              </a>
            ) : (
              <span className="ml-2 font-mono text-xs text-muted">{status.target}</span>
            ))}
        </dd>
        <dt className="text-muted">Oxirgi muvaffaqiyatli</dt>
        <dd>{status.lastSuccessAt ? <DateText value={status.lastSuccessAt} /> : '—'}</dd>
        <dt className="text-muted">Keyingi</dt>
        <dd>{status.nextRunAt ? <DateText value={status.nextRunAt} /> : '—'}</dd>
        {status.tables.length > 0 && (
          <>
            <dt className="text-muted">Hajm</dt>
            <dd className="tabular-nums">
              {status.tables.length} jadval, {rows.toLocaleString('ru-RU')} qator
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
