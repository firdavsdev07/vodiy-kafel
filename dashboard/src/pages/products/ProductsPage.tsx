import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useFactories } from '@/features/factories/api';
import { useProducts } from '@/features/products/api';
import { productListConfig, type ProductFilters, type ProductListItem } from '@/features/products/list';
import { useSizes } from '@/features/sizes/api';
import { surfaceLabel } from '@/shared/lib/labels';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  DataTable,
  DateText,
  FilterBar,
  FilterSelect,
  Pagination,
  StatusBadge,
  tableColumns,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<ProductListItem>();

// 🔁 "Rasm" ustuni — api B-060 (ro'yxatda coverUrl) tayyor bo'lgach qo'shiladi
const columns: DataTableColumn<ProductListItem>[] = [
  col.accessor('name', {
    header: 'Mahsulot',
    size: 260,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className={`truncate font-medium ${row.original.isActive ? '' : 'text-muted'}`}>{row.original.name}</p>
        {row.original.color && <p className="truncate text-xs text-muted">{row.original.color}</p>}
      </div>
    ),
  }),
  col.accessor((p) => p.factory.name, { id: 'factory', header: 'Zavod', size: 160 }),
  col.accessor((p) => p.size.label, {
    id: 'size',
    header: 'O‘lcham',
    size: 100,
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('surface', { header: 'Sirt', size: 80, cell: ({ row }) => surfaceLabel[row.original.surface] }),
  col.accessor((p) => p.stock, {
    id: 'stock',
    header: 'Zaxira',
    size: 170,
    cell: (c) => {
      const stock = c.getValue();
      return (
        <div className="flex items-center gap-2">
          <StatusBadge kind="stock" value={stock.stockStatus} />
          <span className="text-xs text-muted tabular-nums">{stock.stockPallets} paddon</span>
        </div>
      );
    },
  }),
  col.accessor('viewCount', {
    header: 'Ko‘rishlar',
    size: 100,
    enableSorting: true,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('createdAt', {
    header: 'Qo‘shilgan',
    size: 120,
    enableSorting: true,
    cell: (c) => <DateText value={c.getValue()} format="date" />,
  }),
  col.accessor('isActive', {
    header: 'Holat',
    size: 110,
    cell: (c) => (c.getValue() ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">O‘chirilgan</Badge>),
  }),
];

const surfaceOptions = (['POL', 'DEVOR'] as const).map((value) => ({ value, label: surfaceLabel[value] }));
const activeOptions = [
  { value: 'true', label: 'Faol' },
  { value: 'false', label: 'O‘chirilgan' },
] as const;

/**
 * Mahsulotlar (D-011) — filtr, saralash, sahifalash SERVERDA va URL'da.
 * ⚠ Narx bu yerda yo'q va narx bo'yicha saralash yo'q — narx filialga
 * bog'liq (D-016).
 */
export default function ProductsPage() {
  const list = useListParams<ProductFilters>(productListConfig);
  const canWrite = useCan('catalog.write');
  const products = useProducts(list.params);
  const factories = useFactories();
  const sizes = useSizes();
  const { filters } = list.params;
  const page = products.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          search={filters.search}
          onSearchChange={(v) => list.setFilter('search', v)}
          searchPlaceholder="Mahsulot yoki zavod nomi…"
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            canWrite && (
              <Link
                to="/products/new"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:opacity-90"
              >
                <Plus size={16} aria-hidden />
                Yangi mahsulot
              </Link>
            )
          }
        >
          <FilterSelect
            label="Zavod"
            value={filters.factoryId}
            onChange={(v) => list.setFilter('factoryId', v)}
            loading={factories.isPending}
            options={(factories.data ?? []).map((f) => ({
              value: f.id,
              label: f.isActive ? f.name : `${f.name} (o‘chirilgan)`,
            }))}
          />
          <FilterSelect
            label="O‘lcham"
            value={filters.sizeId}
            onChange={(v) => list.setFilter('sizeId', v)}
            loading={sizes.isPending}
            options={(sizes.data ?? []).map((s) => ({ value: s.id, label: s.label }))}
          />
          <FilterSelect
            label="Sirt"
            value={filters.surface}
            onChange={(v) => list.setFilter('surface', v)}
            options={surfaceOptions}
          />
          <FilterSelect
            label="Holat"
            value={filters.isActive}
            onChange={(v) => list.setFilter('isActive', v)}
            options={activeOptions}
          />
        </FilterBar>
      </div>

      <DataTable
        caption="Mahsulotlar"
        columns={columns}
        data={page?.items}
        getRowId={(p) => p.id}
        isLoading={products.isPending}
        isFetching={products.isPlaceholderData}
        error={products.error}
        onRetry={() => void products.refetch()}
        sort={list.params}
        onSortChange={(sort) => list.update(sort)}
        rowHref={(p) => `/products/${p.id}`}
        emptyText={list.hasFilters ? 'Filtrga mos mahsulot topilmadi' : 'Hozircha mahsulot yo‘q'}
        skeletonRows={Math.min(list.params.limit, 10)}
        footer={
          page && (
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              limit={list.params.limit}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
              disabled={products.isPlaceholderData}
            />
          )
        }
      />
    </div>
  );
}
