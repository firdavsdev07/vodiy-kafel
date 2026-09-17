import { CircleAlert, CheckCircle2, UploadCloud, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { errorMessage } from '@/shared/lib/error-message';
import { mediaTypeLabel } from '@/shared/lib/labels';
import { toast } from '@/shared/ui';
import { ACCEPT, formatBytes, guessType, MEDIA_TYPES, precheckFile, type MediaType } from './media';
import { useUploadMedia } from './media-api';

interface QueueItem {
  key: string;
  file: File;
  type: MediaType;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  controller?: AbortController;
}

/**
 * Fayl yuklash (D-013): tanlash yoki sudrab tashlash, bir nechta fayl —
 * navbat bilan (bittadan), har birida progress va bekor qilish. Xato bo'lgan
 * fayl navbatda qoladi — sababi (backend matni) ko'rinadi.
 */
export function MediaUploader({ productId }: { productId: string }) {
  const upload = useUploadMedia(productId);
  const [type, setType] = useState<MediaType>('IMAGE');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const ids = { type: useId(), hint: useId() };

  // Navbatning joriy holati ref'da: yuklash davomida qo'shilgan yoki olib tashlangan
  // fayllarni ishlayotgan sikl ham ko'rsin (state closure eskirib qoladi)
  const queueRef = useRef<QueueItem[]>([]);
  const update = (fn: (current: QueueItem[]) => QueueItem[]) => {
    queueRef.current = fn(queueRef.current);
    setQueue(queueRef.current);
  };
  // Tabdan chiqilsa — ketayotgan yuklash bekor qilinadi (fonda "yo'qolib" qolmasin)
  useEffect(
    () => () => {
      for (const it of queueRef.current) it.controller?.abort();
    },
    [],
  );

  const patch = (key: string, change: Partial<QueueItem>) =>
    update((current) => current.map((it) => (it.key === key ? { ...it, ...change } : it)));

  async function runQueue() {
    if (running.current) return;
    running.current = true;
    let item: QueueItem | undefined;
    while ((item = queueRef.current.find((it) => it.status === 'waiting'))) {
      const { key } = item;
      const controller = new AbortController();
      patch(key, { status: 'uploading', controller });
      try {
        await upload.mutateAsync({
          file: item.file,
          type: item.type,
          signal: controller.signal,
          onProgress: (progress) => patch(key, { progress }),
        });
        patch(key, { status: 'done', progress: 1, controller: undefined });
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        patch(key, { status: 'error', controller: undefined, error: aborted ? 'Bekor qilindi' : errorMessage(error) });
      }
    }
    running.current = false;
    // Yuklanganlar bir necha soniyadan keyin ro'yxatdan tushadi, xatolar qoladi
    setTimeout(() => update((current) => current.filter((it) => it.status !== 'done')), 2500);
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: QueueItem[] = [...files].map((file, i) => {
      const fileType = guessType(file, type);
      const problem = precheckFile(file, fileType);
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        type: fileType,
        status: problem ? 'error' : 'waiting',
        progress: 0,
        error: problem ?? undefined,
      };
    });
    update((current) => [...current, ...added]);
    void runQueue();
    const skipped = added.filter((a) => a.status === 'error').length;
    if (skipped) toast.error(`${skipped} ta fayl yuborilmadi — sababi ro‘yxatda`);
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    // Ichki tartiblash (media kartasini sudrash) — fayl emas
    if (!event.dataTransfer.types.includes('Files')) return;
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={ids.type} className="flex flex-col gap-1 text-xs text-muted">
          Yuklanadigan tur
          <select
            id={ids.type}
            value={type}
            onChange={(e) => setType(e.target.value as MediaType)}
            className="h-9 min-w-44 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
          >
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {mediaTypeLabel[t]}
              </option>
            ))}
          </select>
        </label>
        <p id={ids.hint} className="pb-2 text-xs text-muted">
          Rasm: JPG, PNG, WEBP · 360° video: MP4 · 10 MB gacha. Fayl turi mazmunidan tekshiriladi.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? 'border-accent bg-surface-muted' : 'border-line-strong'
        }`}
      >
        <UploadCloud size={24} className="text-muted" aria-hidden />
        <p className="text-sm">
          Fayllarni shu yerga tashlang yoki{' '}
          <button type="button" onClick={() => inputRef.current?.click()} className="font-medium underline underline-offset-2">
            kompyuterdan tanlang
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={type === 'VIDEO_360' ? ACCEPT.VIDEO_360 : `${ACCEPT.IMAGE},${ACCEPT.VIDEO_360}`}
          aria-describedby={ids.hint}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ''; // o'sha faylni qayta tanlash mumkin bo'lsin
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul aria-label="Yuklash navbati" className="flex flex-col gap-2">
          {queue.map((item) => (
            <li key={item.key} className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm">
              {item.status === 'error' ? (
                <CircleAlert size={16} className="shrink-0 text-danger" aria-hidden />
              ) : item.status === 'done' ? (
                <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden />
              ) : (
                <UploadCloud size={16} className="shrink-0 text-muted" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {item.file.name}{' '}
                  <span className="text-xs text-muted">
                    · {mediaTypeLabel[item.type]} · {formatBytes(item.file.size)}
                  </span>
                </p>
                {item.status === 'error' ? (
                  <p className="text-xs whitespace-pre-line text-danger">{item.error}</p>
                ) : (
                  <div
                    role="progressbar"
                    aria-label={`${item.file.name} yuklanmoqda`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(item.progress * 100)}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${item.status === 'done' ? 'bg-success' : 'bg-accent'}`}
                      style={{ width: `${Math.round((item.status === 'waiting' ? 0 : item.progress) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                {item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : item.status === 'waiting' ? 'navbat' : ''}
              </span>
              {item.status === 'uploading' || item.status === 'waiting' || item.status === 'error' ? (
                <button
                  type="button"
                  aria-label={item.status === 'error' ? `${item.file.name} — ro‘yxatdan olib tashlash` : `${item.file.name} — bekor qilish`}
                  onClick={() =>
                    item.status === 'uploading'
                      ? item.controller?.abort()
                      : update((current) => current.filter((it) => it.key !== item.key))
                  }
                  className="rounded-sm text-muted hover:text-fg"
                >
                  <X size={15} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
