import { ArrowLeft, ArrowRight, ExternalLink, GripVertical, Rotate3d, Trash2, Video } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { errorMessage } from '@/shared/lib/error-message';
import { mediaTypeLabel } from '@/shared/lib/labels';
import { Badge, ConfirmDialog, IconButton, toast } from '@/shared/ui';
import { moveItem } from '@/shared/lib/move-item';
import type { ProductMedia } from './media';
import { useDeleteMedia, useReorderMedia } from './media-api';

const DRAG_TYPE = 'application/x-vk-media';

/**
 * Media ro'yxati (D-013). Tartib: kartani sudrab tashlash YOKI ← → tugmalari
 * (klaviatura bilan ham). Birinchi fayl (oddiy rasm bo'lsa) — katalog kartasidagi
 * asosiy rasm. Rasm ustidagi belgilar rejimdan qat'i nazar qorong'i fon (ink/bone).
 */
export function MediaGrid({
  productId,
  media,
  canWrite,
}: {
  productId: string;
  media: readonly ProductMedia[];
  canWrite: boolean;
}) {
  const reorder = useReorderMedia(productId);
  const remove = useDeleteMedia(productId);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProductMedia | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= media.length) return;
    reorder.mutate(moveItem(media, from, to), {
      onError: (error) => toast.error(`Tartib saqlanmadi: ${errorMessage(error)}`),
    });
  };

  const onDrop = (event: DragEvent, to: number) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    const from = Number(event.dataTransfer.getData(DRAG_TYPE));
    setDragIndex(null);
    setOverIndex(null);
    move(from, to);
  };

  if (media.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Hozircha media yo‘q</p>;
  }

  return (
    <>
      <ol aria-label="Media fayllar tartibi" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {media.map((item, index) => {
          const url = resolveAssetUrl(item.url);
          // Backend: ro'yxatda BIRINCHI turgan fayl kartada ko'rinadi — faqat u oddiy rasm bo'lsa
          const isCover = index === 0 && item.type === 'IMAGE';
          return (
            <li
              key={item.id}
              draggable={canWrite && !reorder.isPending}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, String(index));
                e.dataTransfer.effectAllowed = 'move';
                setDragIndex(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => onDrop(e, index)}
              className={`group flex flex-col overflow-hidden rounded-lg border bg-surface transition ${
                overIndex === index && dragIndex !== index ? 'border-accent' : 'border-line'
              } ${dragIndex === index ? 'opacity-40' : ''}`}
            >
              <div className="relative aspect-square bg-surface-muted">
                {item.type === 'VIDEO_360' ? (
                  <video src={url} muted preload="metadata" className="size-full object-cover" />
                ) : (
                  <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                )}
                <span className="absolute top-2 left-2 flex gap-1">
                  <span className="rounded-sm bg-ink/70 px-1.5 py-0.5 text-xs font-medium text-bone tabular-nums">
                    {index + 1}
                  </span>
                  {isCover && <Badge tone="info">Asosiy</Badge>}
                </span>
                {canWrite && (
                  <span
                    aria-hidden
                    className="absolute top-2 right-2 cursor-grab rounded-sm bg-ink/70 p-1 text-bone opacity-0 group-hover:opacity-100"
                  >
                    <GripVertical size={14} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="mr-auto inline-flex min-w-0 items-center gap-1 truncate text-xs text-muted">
                  {item.type === 'IMAGE_360' && <Rotate3d size={13} aria-hidden />}
                  {item.type === 'VIDEO_360' && <Video size={13} aria-hidden />}
                  {mediaTypeLabel[item.type]}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${index + 1}-fayl — yangi oynada ochish`}
                  title="Yangi oynada ochish"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-fg"
                >
                  <ExternalLink size={14} aria-hidden />
                </a>
                {canWrite && (
                  <>
                    <IconButton label={`${index + 1}-faylni chapga surish`} onClick={() => move(index, index - 1)} disabled={index === 0 || reorder.isPending}>
                      <ArrowLeft size={14} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`${index + 1}-faylni o‘ngga surish`}
                      onClick={() => move(index, index + 1)}
                      disabled={index === media.length - 1 || reorder.isPending}
                    >
                      <ArrowRight size={14} aria-hidden />
                    </IconButton>
                    <IconButton label={`${index + 1}-faylni o‘chirish`} onClick={() => setDeleting(item)} danger>
                      <Trash2 size={14} aria-hidden />
                    </IconButton>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        danger
        title="Faylni o‘chirish?"
        description="Fayl serverdan butunlay o‘chiriladi — qaytarib bo‘lmaydi."
        confirmText="O‘chirish"
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : undefined}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Fayl o‘chirildi');
              setDeleting(null);
            },
          })
        }
      />
    </>
  );
}
