import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { addToCart } from '@/features/cabinet/cart-store';
import {
  useCabinetCatalog,
  useCatalogFilterOptions,
  CATALOG_SORT_KEYS,
  type CatalogFilters,
  type CatalogItem,
} from '@/features/cabinet/catalog-api';
import { resolveAssetUrl } from '@/shared/lib/asset-url';
import { surfaceLabel } from '@/shared/lib/labels';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Button,
  ErrorState,
  FilterBar,
  FilterSelect,
  MoneyText,
  Pagination,
  StatusBadge,
  toast,
} from '@/shared/ui';

const config: ListParamsConfig<CatalogFilters> = {
  filterKeys: ['search', 'factoryId', 'sizeId', 'surface'],
  sortKeys: CATALOG_SORT_KEYS,
};

const surfaceOptions = [
  { value: 'POL', label: surfaceLabel.POL },
  { value: 'DEVOR', label: surfaceLabel.DEVOR },
] as const;

/**
 * Kabinet katalogi (D-052) — narx va uch darajali zaxira bilan.
 *
 * ⚠ Jadval EMAS, KARTOCHKA: kabinet telefonda ishlatiladi (mijoz ofisda
 *   emas) va mahsulot tanlashda surat asosiy narsa.
 *
 * 🔒 Chegirmaning SABABI ko'rsatilmaydi — faqat yakuniy narx
 *   (CLAUDE.md qoida 11). Backend ham bazaviy narxni bermaydi.
 */
export default function CatalogPage() {
  const list = useListParams<CatalogFilters>(config);
  const catalog = useCabinetCatalog(list.params);
  const { factories, sizes } = useCatalogFilterOptions();

  const factoryOptions = (factories.data ?? []).map((f) => ({ value: f.id, label: f.name }));
  const sizeOptions = (sizes.data ?? []).map((s) => ({ value: s.id, label: s.label }));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          search={list.params.filters.search}
          onSearchChange={(value) => list.setFilter('search', value)}
          searchPlaceholder="Mahsulot yoki zavod nomi…"
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
        >
          <FilterSelect
            label="Zavod"
            value={list.params.filters.factoryId}
            onChange={(value) => list.setFilter('factoryId', value)}
            loading={factories.isPending}
            allLabel="Barcha zavodlar"
            options={factoryOptions}
          />
          <FilterSelect
            label="O‘lcham"
            value={list.params.filters.sizeId}
            onChange={(value) => list.setFilter('sizeId', value)}
            loading={sizes.isPending}
            allLabel="Barcha o‘lchamlar"
            options={sizeOptions}
          />
          <FilterSelect
            label="Sirt"
            value={list.params.filters.surface}
            onChange={(value) => list.setFilter('surface', value)}
            options={surfaceOptions}
          />
        </FilterBar>
      </div>

      {catalog.error ? (
        <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
      ) : catalog.isPending ? (
        <CardGridSkeleton />
      ) : catalog.data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-muted">
          {list.hasFilters
            ? 'Filtrga mos mahsulot topilmadi'
            : 'Filialingizda hozircha sotuvdagi mahsulot yo‘q'}
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {catalog.data.items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </ul>
          {/* `Pagination` ning o'z `border-t` si — quti chegarasi bilan qo'shilib ketmasin */}
          <div className="rounded-lg border border-line bg-surface [&>nav]:border-t-0">
            <Pagination
              page={catalog.data.page}
              limit={catalog.data.limit}
              total={catalog.data.total}
              totalPages={catalog.data.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ProductCard({ item }: { item: CatalogItem }) {
  const image = resolveAssetUrl(item.primaryImageUrl);
  const soldOut = item.stockStatus === 'OUT_OF_STOCK';

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <Link
        to={`/kabinet/mahsulot/${item.slug}`}
        className="flex aspect-4/3 items-center justify-center overflow-hidden bg-surface-muted"
      >
        {image ? (
          <img
            src={image}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 hover:scale-[1.02]"
          />
        ) : (
          <span className="text-xs text-muted">Surat yo‘q</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-col gap-1">
          <Link
            to={`/kabinet/mahsulot/${item.slug}`}
            className="line-clamp-2 text-sm font-medium hover:underline"
          >
            {item.name}
          </Link>
          <p className="text-xs text-muted">
            {item.factory.name} · {item.size.label} · {surfaceLabel[item.surface]}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            {/* G6: narx satr ustida formatlanadi */}
            <MoneyText value={item.pricePerSqm} className="text-sm font-semibold" />
            <span className="text-xs whitespace-nowrap text-muted">1 m²</span>
          </div>
          <StatusBadge kind="stock" value={item.stockStatus} />
          <Button
            size="sm"
            variant={soldOut ? 'secondary' : 'primary'}
            disabled={soldOut}
            title={soldOut ? 'Omborda tugagan' : undefined}
            onClick={() => {
              if (
                addToCart({ productId: item.id, slug: item.slug, name: item.name, pallets: 1 })
              ) {
                toast.success(`“${item.name}” savatga qo‘shildi`);
              }
            }}
          >
            <Plus size={15} aria-hidden />
            Savatga
          </Button>
        </div>
      </div>
    </li>
  );
}

function CardGridSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="aspect-4/3 animate-pulse bg-surface-muted" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-4 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 animate-pulse rounded bg-surface-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
