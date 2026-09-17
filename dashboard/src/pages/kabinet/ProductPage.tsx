import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { MAX_PALLETS, MIN_PALLETS } from '@/features/cabinet/cart';
import { addToCart } from '@/features/cabinet/cart-store';
import { useCabinetProduct } from '@/features/cabinet/catalog-api';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { mediaTypeLabel, surfaceLabel } from '@/shared/lib/labels';
import { Button, ErrorState, MoneyText, PageLoading, StatusBadge, toast } from '@/shared/ui';

/**
 * Kabinetdagi mahsulot sahifasi (D-052): surat, tavsif, narx, zaxira
 * holati va paddon soni bilan savatga qo'shish.
 *
 * ⚠ Paddon (kv.m emas) — TZ 3.3. Chegaralar backend bilan bir xil:
 *   1 … 100 000.
 */
export default function CabinetProductPage() {
  const { slug = '' } = useParams();
  const product = useCabinetProduct(slug);
  const [pallets, setPallets] = useState(MIN_PALLETS);

  if (product.isPending) return <PageLoading />;
  if (product.error) {
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />;
  }

  const item = product.data;
  const images = item.media.filter((media) => media.type === 'IMAGE');
  const other = item.media.filter((media) => media.type !== 'IMAGE');
  const soldOut = item.stockStatus === 'OUT_OF_STOCK';

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/kabinet"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} aria-hidden />
        Katalogga qaytish
      </Link>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Gallery images={images} name={item.name} />
          {other.length > 0 && (
            <p className="text-xs text-muted">
              Qo‘shimcha materiallar: {other.map((m) => mediaTypeLabel[m.type]).join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="text-sm text-muted">
              {item.factory.name} · {item.size.label} · {surfaceLabel[item.surface]}
              {item.color ? ` · ${item.color}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
            <div>
              <p className="text-xs text-muted">1 m² narxi</p>
              <MoneyText value={item.pricePerSqm} className="text-md font-semibold" />
            </div>
            <div className="ml-auto">
              <StatusBadge kind="stock" value={item.stockStatus} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">1 paddonda</dt>
              <dd className="tabular-nums">{item.sqmPerPallet} m²</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">1 paddon og‘irligi</dt>
              <dd className="tabular-nums">{item.weightPerPallet} kg</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Paddon soni
              <input
                type="number"
                min={MIN_PALLETS}
                max={MAX_PALLETS}
                step={1}
                value={pallets}
                onChange={(event) => setPallets(Number(event.target.value))}
                className="h-9 w-28 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg tabular-nums"
              />
            </label>
            <Button
              variant="primary"
              disabled={soldOut}
              title={soldOut ? 'Omborda tugagan' : undefined}
              onClick={() => {
                if (addToCart({ productId: item.id, slug: item.slug, name: item.name, pallets })) {
                  toast.success(`“${item.name}” savatga qo‘shildi`);
                }
              }}
            >
              <Plus size={16} aria-hidden />
              Savatga qo‘shish
            </Button>
            {/* 🔒 Summa BU YERDA hisoblanmaydi: yakuniy raqamni savatdagi
                kalkulyator backenddan oladi (CLAUDE.md qoida 1). */}
            <p className="w-full text-xs text-muted">
              Umumiy summa savatda ko‘rsatiladi — u backendda hisoblanadi.
            </p>
          </div>

          {item.description && (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Tavsif</h3>
              <p className="text-sm whitespace-pre-line text-muted">{item.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Gallery({
  images,
  name,
}: {
  images: { id: string; url: string }[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = resolveAssetUrl(images[active]?.url);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-muted">
        {current ? (
          <img src={current} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-sm text-muted">Surat yo‘q</span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`${index + 1}-surat`}
                aria-current={index === active}
                className={`size-16 overflow-hidden rounded-md border ${
                  index === active ? 'border-accent' : 'border-line'
                }`}
              >
                <img
                  src={resolveAssetUrl(image.url)}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
