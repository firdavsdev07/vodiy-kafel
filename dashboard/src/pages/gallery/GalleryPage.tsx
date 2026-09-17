import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useDeleteGalleryItem, useGallery, useUpdateGalleryItem, type GalleryFilters } from '@/features/gallery/api';
import type { GalleryItem } from '@/features/gallery/gallery-form';
import { GalleryItemModal } from '@/features/gallery/GalleryItemModal';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { errorMessage } from '@/shared/lib/error-message';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import { Badge, Button, ConfirmDialog, ErrorState, FilterBar, FilterSelect, IconButton, Pagination, toast } from '@/shared/ui';

const listConfig: ListParamsConfig<GalleryFilters> = { filterKeys: ['isActive'], defaultLimit: 24 };
const activeOptions = [
  { value: 'true', label: 'Ko‘rinadi' },
  { value: 'false', label: 'Yashirilgan' },
] as const;

type Dialog = { type: 'create' } | { type: 'edit'; item: GalleryItem } | { type: 'delete'; item: GalleryItem } | null;

/**
 * Loyiha galereyasi (D-015) — bitirilgan ishlar rasmlari. 🔒 Yozish — faqat
 * SUPER_ADMIN; boshqalar ko'radi.
 */
export default function GalleryPage() {
  const canWrite = useCan('catalog.write');
  const list = useListParams<GalleryFilters>(listConfig);
  const gallery = useGallery(list.params);
  const update = useUpdateGalleryItem();
  const remove = useDeleteGalleryItem();
  const [dialog, setDialog] = useState<Dialog>(null);
  const page = gallery.data;
  const deleting = dialog?.type === 'delete' ? dialog.item : undefined;

  const toggle = (item: GalleryItem) =>
    update.mutate(
      { id: item.id, body: { isActive: !item.isActive } },
      {
        onSuccess: () => toast.success(item.isActive ? 'Rasm ochiq galereyadan yashirildi' : 'Rasm yana ko‘rinadi'),
        onError: toast.error,
      },
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            canWrite && (
              <Button variant="primary" onClick={() => setDialog({ type: 'create' })}>
                <Plus size={16} aria-hidden />
                Rasm qo‘shish
              </Button>
            )
          }
        >
          <FilterSelect label="Holat" value={list.params.filters.isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
        </FilterBar>

        {gallery.isPending ? (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : gallery.error && !page ? (
          <ErrorState error={gallery.error} onRetry={() => void gallery.refetch()} retrying={gallery.isFetching} />
        ) : page && page.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {list.hasFilters ? 'Filtrga mos rasm yo‘q' : 'Galereya bo‘sh'}
          </p>
        ) : (
          <ul
            aria-busy={gallery.isPlaceholderData || undefined}
            className={`grid grid-cols-2 gap-4 p-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${gallery.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {page?.items.map((item) => (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-lg border border-line">
                <div className="relative aspect-[4/3] bg-surface-muted">
                  <img
                    src={resolveAssetUrl(item.imageUrl)}
                    alt={item.title ?? ''}
                    loading="lazy"
                    className={`size-full object-cover ${item.isActive ? '' : 'opacity-50 grayscale'}`}
                  />
                  <span className="absolute top-2 left-2 flex gap-1">
                    <span className="rounded-sm bg-ink/70 px-1.5 py-0.5 text-xs text-bone tabular-nums" title="Tartib">
                      #{item.sortOrder}
                    </span>
                    {!item.isActive && <Badge tone="neutral">Yashirilgan</Badge>}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className={`line-clamp-2 text-sm font-medium ${item.title ? '' : 'text-muted'}`}>{item.title ?? 'Sarlavhasiz'}</p>
                  {item.product && (
                    <Link to={`/products/${item.product.id}`} className="truncate text-xs text-muted hover:text-fg hover:underline">
                      {item.product.name}
                      {!item.product.isActive && ' (o‘chirilgan)'}
                    </Link>
                  )}
                  {canWrite && (
                    <div className="mt-auto flex justify-end gap-1 pt-2">
                      <IconButton label={item.isActive ? 'Yashirish' : 'Ko‘rsatish'} onClick={() => toggle(item)} disabled={update.isPending}>
                        {item.isActive ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                      </IconButton>
                      <IconButton label="Tahrirlash" onClick={() => setDialog({ type: 'edit', item })}>
                        <Pencil size={15} aria-hidden />
                      </IconButton>
                      <IconButton label="O‘chirish" onClick={() => setDialog({ type: 'delete', item })} danger>
                        <Trash2 size={15} aria-hidden />
                      </IconButton>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {page && page.total > 0 && (
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            limit={list.params.limit}
            onPageChange={list.setPage}
            disabled={gallery.isPlaceholderData}
          />
        )}
      </div>

      {canWrite && (
        <>
          <GalleryItemModal
            open={dialog?.type === 'create' || dialog?.type === 'edit'}
            item={dialog?.type === 'edit' ? dialog.item : undefined}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            onClose={() => {
              setDialog(null);
              remove.reset();
            }}
            danger
            title="Rasmni butunlay o‘chirish?"
            description="Yozuv va fayl serverdan o‘chiriladi. Vaqtincha olib tashlash uchun “Yashirish” dan foydalaning."
            confirmText="O‘chirish"
            pending={remove.isPending}
            error={remove.error ? errorMessage(remove.error) : undefined}
            onConfirm={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast.success('Rasm o‘chirildi');
                  setDialog(null);
                },
              })
            }
          />
        </>
      )}
    </div>
  );
}
