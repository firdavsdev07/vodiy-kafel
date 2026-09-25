import { Megaphone, Search, Send, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useProfile } from '@/features/auth/hooks';
import {
  useAnnouncements,
  useRecipientSearch,
  useSendAnnouncement,
  type Announcement,
  type AnnouncementAudience,
} from '@/features/announcements/api';
import { ImageFilePicker } from '@/features/products/ImageFilePicker';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { errorMessage } from '@/shared/lib/error-message';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Badge, Button, DateText, ErrorState, Pagination, toast } from '@/shared/ui';

const TITLE_MAX = 120;
const BODY_MAX = 2000;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

type Recipient = { id: string; companyName: string; login: string };

/**
 * Mijozlarga xabar (T-009) — bayram tabrigi, e'lon. Rasm (ixtiyoriy, bitta)
 * + ostida matn. 🔒 Kimga yetishi backendda: SUPER_ADMIN va MODERATOR —
 * hamma mijoz, filial admini — o'z filiali, menejer — faqat o'ziga
 * biriktirilgan mijozlar ("Barchasiga" ham shu doira ichida).
 */
export default function AnnouncementsPage() {
  const profile = useProfile().data;
  const isManager = profile?.role === 'MANAGER';
  const scopeText =
    profile?.role === 'SUPER_ADMIN' || profile?.role === 'MODERATOR'
      ? 'barcha faol mijozlarga'
      : isManager
        ? 'sizga biriktirilgan barcha faol mijozlarga'
        : 'filialingizdagi barcha faol mijozlarga';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ComposeCard scopeText={scopeText} managerId={isManager ? (profile?.id ?? null) : null} />
      <HistoryCard />
    </div>
  );
}

function ComposeCard({ scopeText, managerId }: { scopeText: string; managerId: string | null }) {
  const send = useSendAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setBody('');
    setAudience('ALL');
    setSelected([]);
    setImage(null);
    setImageError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!body.trim()) return setError('Xabar matnini yozing');
    if (audience === 'SELECTED' && selected.length === 0) return setError('Kamida bitta mijozni tanlang');
    send.mutate(
      { title, body, audience, customerIds: selected.map((c) => c.id), image },
      {
        onSuccess: (sent) => {
          toast.success(`Xabar ${sent.recipientCount} ta mijozga yuborildi`);
          reset();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <Megaphone size={16} aria-hidden />
        <h2 className="text-sm font-medium">Yangi xabar</h2>
      </div>

      <fieldset disabled={send.isPending} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Rasm (ixtiyoriy)</span>
          <ImageFilePicker
            id="announcement-image"
            file={image}
            error={imageError}
            disabled={send.isPending}
            onPick={(file) => {
              if (!file) return;
              if (file.size > IMAGE_MAX_BYTES) {
                setImageError('Rasm 10 MB dan katta');
                return;
              }
              setImageError(null);
              setImage(file);
            }}
            onClear={() => setImage(null)}
          />
          <p className="text-xs text-muted">Mijoz kabinetida rasm yuqorida, matn uning ostida ko‘rinadi.</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Sarlavha (ixtiyoriy)
          <input
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Navro‘z muborak!"
            className="h-9 rounded-md border border-line-strong bg-surface px-3 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Xabar matni
          <textarea
            value={body}
            maxLength={BODY_MAX}
            rows={5}
            required
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hurmatli mijozlar, …"
            className="rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-normal"
          />
          <span className="self-end text-xs font-normal text-muted tabular-nums">
            {body.length} / {BODY_MAX}
          </span>
        </label>

        <div role="radiogroup" aria-label="Kimga" className="flex flex-col gap-2">
          <span className="text-sm font-medium">Kimga</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['ALL', 'Barchasiga', scopeText],
                ['SELECTED', 'Tanlangan mijozlarga', 'Ro‘yxatdan tanlang'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  audience === value ? 'border-fg bg-surface-muted' : 'border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={value}
                  checked={audience === value}
                  onChange={() => setAudience(value)}
                  className="mt-0.5 size-4 accent-accent"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {audience === 'SELECTED' && (
          <RecipientPicker selected={selected} onChange={setSelected} managerId={managerId} />
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" pending={send.isPending} className="self-start">
        <Send size={15} aria-hidden />
        Yuborish
      </Button>
    </form>
  );
}

function RecipientPicker({
  selected,
  onChange,
  managerId,
}: {
  selected: Recipient[];
  onChange: (next: Recipient[]) => void;
  managerId: string | null;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const results = useRecipientSearch(debounced, managerId);
  const chosen = new Set(selected.map((c) => c.id));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <label className="relative">
        <span className="sr-only">Mijoz qidirish</span>
        <Search size={15} className="absolute top-2.5 left-2.5 text-muted" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kompaniya, login yoki telefon (kamida 2 harf)"
          className="h-9 w-full rounded-md border border-line-strong bg-surface pr-3 pl-8 text-sm"
        />
      </label>

      {debounced.trim().length >= 2 &&
        (results.isPending ? (
          <p className="text-xs text-muted">Qidirilmoqda…</p>
        ) : results.error ? (
          <ErrorState error={results.error} onRetry={() => void results.refetch()} compact />
        ) : results.data.items.length === 0 ? (
          <p className="text-xs text-muted">Mijoz topilmadi</p>
        ) : (
          <ul className="flex max-h-48 flex-col overflow-y-auto rounded-md border border-line">
            {results.data.items.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={chosen.has(c.id)}
                    onChange={() =>
                      onChange(
                        chosen.has(c.id)
                          ? selected.filter((s) => s.id !== c.id)
                          : [...selected, { id: c.id, companyName: c.companyName, login: c.login }],
                      )
                    }
                    className="size-4 accent-accent"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.companyName}</span>
                  <span className="font-mono text-xs text-muted">{c.login}</span>
                </label>
              </li>
            ))}
          </ul>
        ))}

      {selected.length > 0 ? (
        <ul aria-label="Tanlangan mijozlar" className="flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pr-1 pl-2.5 text-xs">
              {c.companyName}
              <button
                type="button"
                aria-label={`${c.companyName} — olib tashlash`}
                onClick={() => onChange(selected.filter((s) => s.id !== c.id))}
                className="inline-flex size-5 items-center justify-center rounded-full hover:bg-surface"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">Hali mijoz tanlanmagan</p>
      )}
    </div>
  );
}

function HistoryCard() {
  const [page, setPage] = useState(1);
  const history = useAnnouncements(page);

  return (
    <section className="flex flex-col rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-medium">Yuborilgan xabarlar</h2>
      {history.error ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <p className="p-4 text-sm text-muted">Yuklanmoqda…</p>
      ) : history.data.items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">Hozircha xabar yuborilmagan</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {history.data.items.map((a) => (
              <HistoryRow key={a.id} announcement={a} />
            ))}
          </ul>
          <Pagination
            page={history.data.page}
            limit={history.data.limit}
            total={history.data.total}
            totalPages={history.data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

function HistoryRow({ announcement: a }: { announcement: Announcement }) {
  return (
    <li className="flex gap-3 px-4 py-3">
      {a.imageUrl && (
        <img src={resolveAssetUrl(a.imageUrl)} alt="" className="size-14 shrink-0 rounded-md object-cover" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{a.title}</p>
          <Badge tone="neutral">{a.audience === 'ALL' ? 'Barchasiga' : 'Tanlanganlarga'}</Badge>
        </div>
        <p className="line-clamp-2 text-sm whitespace-pre-line text-muted">{a.body}</p>
        <p className="text-xs text-muted">
          <DateText value={a.createdAt} /> · {a.createdBy.fullName} · {a.recipientCount} ta mijoz
        </p>
      </div>
    </li>
  );
}
