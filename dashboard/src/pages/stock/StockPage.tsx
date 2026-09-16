import { SlidersHorizontal, Warehouse, X } from 'lucide-react';
import { createContext, use, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useProduct } from '@/features/products/api';
import { useStocks, type StockFilters } from '@/features/stock/api';
import { PalletsCell } from '@/features/stock/PalletsCell';
import type { StockRow } from '@/features/stock/stock';
import { ThresholdModal } from '@/features/stock/ThresholdModal';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import { DataTable, DateText, IconButton, Pagination, StatusBadge, tableColumns, type DataTableColumn } from '@/shared/ui';

const listConfig: ListParamsConfig<StockFilters> = { filterKeys: ['productId'] };
const col = tableColumns<StockRow>();

interface Ctx {
  canWrite: boolean;
  reasonId: string;
  editThreshold: (row: StockRow) => void;
}
const StockContext = createContext<Ctx>({ canWrite: false, reasonId: '', editThreshold: () => {} });

// ⚠ "Filial" ustuni ATAYLAB yo'q — zaxira bitta umumiy son (api/CLAUDE.md §5)
const columns: DataTableColumn<StockRow>[] = [
  col.accessor((r) => r.product.name, {
    id: 'product',
    header: 'Mahsulot',
    size: 280,
    cell: ({ row }) => (
      <Link to={`/products/${row.original.product.id}`} className={`font-medium hover:underline ${row.original.product.isActive ? '' : 'text-muted'}`}>
        {row.original.product.name}
      </Link>
    ),
  }),
  col.accessor('stockPallets', {
    header: 'Paddonlar',
    size: 190,
    meta: { align: 'right' },
    cell: ({ row }) => <PalletsWithContext row={row.original} />,
  }),
  col.accessor('stockStatus', {
    header: 'Holat',
    size: 130,
    cell: (c) => <StatusBadge kind="stock" value={c.getValue()} />,
  }),
  col.accessor('effectiveThreshold', {
    header: '«Kam qoldi» chegarasi',
    size: 190,
    cell: ({ row }) => <ThresholdCell row={row.original} />,
  }),
  col.accessor('updatedAt', {
    header: 'Yangilangan',
    size: 150,
    cell: (c) => (c.getValue() ? <DateText value={c.getValue()} /> : <span className="text-xs text-muted">Hali kiritilmagan</span>),
  }),
];

/**
 * Zaxira (D-018). ⚠ FILIALGA BOG'LIQ EMAS — markaziy ombordagi bitta son.
 * 🔒 Yozish — SUPER_ADMIN, MODERATOR; filial admini/menejeri faqat ko'radi
 * (maydonlar disabled, sababi aytiladi).
 */
export default function StockPage() {
  const canWrite = useCan('stock.write');
  const list = useListParams<StockFilters>(listConfig);
  const stocks = useStocks(list.params);
  const productId = list.params.filters.productId;
  const product = useProduct(productId ?? '');
  const [threshold, setThreshold] = useState<StockRow | null>(null);
  const reasonId = useId();
  const ctx = useMemo(() => ({ canWrite, reasonId, editThreshold: setThreshold }), [canWrite, reasonId]);
  const page = stocks.data;

  return (
    <StockContext value={ctx}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <Warehouse size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Zaxira filialga bog‘liq emas — bu markaziy ombordagi bitta umumiy son.</p>
            <p id={reasonId} className="mt-0.5">
              {canWrite
                ? 'Kiritiladigan son — ombordagi YANGI qoldiq (farq emas). Enter — saqlash, Esc — bekor.'
                : 'Zaxira markaziy omborda boshqariladi — bu yerda faqat ko‘rish mumkin.'}
            </p>
          </div>
        </div>

        {productId && (
          <span className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-surface-muted pr-1 pl-3 text-sm">
            Mahsulot: <strong className="font-medium">{product.data?.name ?? '…'}</strong>
            <button
              type="button"
              onClick={() => list.setFilter('productId', undefined)}
              aria-label="Mahsulot filtrini olib tashlash"
              className="inline-flex size-7 items-center justify-center rounded-sm text-muted hover:text-fg"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        )}

        <DataTable
          caption="Markaziy ombor zaxirasi"
          columns={columns}
          data={page?.items}
          getRowId={(r) => r.product.id}
          isLoading={stocks.isPending}
          isFetching={stocks.isPlaceholderData}
          error={stocks.error}
          onRetry={() => void stocks.refetch()}
          emptyText="Mahsulot topilmadi"
          footer={
            page && (
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                total={page.total}
                limit={list.params.limit}
                onPageChange={list.setPage}
                onLimitChange={list.setLimit}
                disabled={stocks.isPlaceholderData}
              />
            )
          }
        />

        {canWrite && <ThresholdModal row={threshold} onClose={() => setThreshold(null)} />}
      </div>
    </StockContext>
  );
}

function PalletsWithContext({ row }: { row: StockRow }) {
  const { canWrite, reasonId } = use(StockContext);
  return <PalletsCell row={row} canEdit={canWrite} reasonId={reasonId} />;
}

function ThresholdCell({ row }: { row: StockRow }) {
  const { canWrite, editThreshold } = use(StockContext);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="tabular-nums">{row.effectiveThreshold}</span>
      <span className="text-xs text-muted">{row.lowStockThreshold == null ? '· global' : '· o‘ziniki'}</span>
      {canWrite && (
        <IconButton label={`${row.product.name} — chegarani o‘zgartirish`} onClick={() => editThreshold(row)}>
          <SlidersHorizontal size={14} aria-hidden />
        </IconButton>
      )}
    </span>
  );
}
