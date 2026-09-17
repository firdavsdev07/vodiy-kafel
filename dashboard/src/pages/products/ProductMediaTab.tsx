import { useCan } from '@/features/auth/hooks';
import { MediaGrid } from '@/features/products/MediaGrid';
import { MediaUploader } from '@/features/products/MediaUploader';
import { useProductMedia } from '@/features/products/media-api';
import { useProductOutlet } from '@/features/products/use-product-outlet';
import { ErrorState } from '@/shared/ui';

/** "Media" tab (D-013): yuklash (SUPER_ADMIN), ro'yxat, tartib, o'chirish. */
export default function ProductMediaTab() {
  const product = useProductOutlet();
  const canWrite = useCan('catalog.write');
  const media = useProductMedia(product.id);

  return (
    <div className="flex flex-col gap-6">
      {canWrite && <MediaUploader productId={product.id} />}
      {media.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      ) : media.error ? (
        <ErrorState error={media.error} onRetry={() => void media.refetch()} retrying={media.isFetching} compact />
      ) : (
        <section aria-labelledby="media-heading" className="flex flex-col gap-3">
          <h3 id="media-heading" className="text-sm font-medium">
            Fayllar <span className="text-muted tabular-nums">({media.data.length})</span>
          </h3>
          {canWrite && media.data.length > 1 && (
            <p className="-mt-2 text-xs text-muted">
              Tartibni kartani sudrab yoki ← → tugmalari bilan o‘zgartiring. Birinchi fayl (oddiy rasm bo‘lsa) — katalog kartasidagi asosiy rasm.
            </p>
          )}
          <MediaGrid productId={product.id} media={media.data} canWrite={canWrite} />
        </section>
      )}
    </div>
  );
}
