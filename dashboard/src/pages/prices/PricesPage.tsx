import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { createContext, use, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useProduct } from '@/features/products/api';
import { AddPriceModal } from '@/features/prices/AddPriceModal';
import { BulkPriceModal } from '@/features/prices/BulkPriceModal';
import { useBranches } from '@/features/branches/api';
import { useBranchPrices, useUpsertPrice } from '@/features/prices/api';
import { PriceCell } from '@/features/prices/PriceCell';
import {
  branchPriceConfig,
  superAdminPriceConfig,
  toggleActiveBody,
  type BranchPrice,
  type PriceFilters,
} from '@/features/prices/prices';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  Button,
  DataTable,
  DateText,
  FilterBar,
  FilterSelect,
  IconButton,
  Pagination,
  tableColumns,
  toast,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<BranchPrice>();

interface RowContext {
  canWrite: boolean;
  isSuperAdmin: boolean;
  isSelected: (id: string) => boolean;
  toggle: (row: BranchPrice) => void;
  pageRows: readonly BranchPrice[];
  togglePage: (select: boolean) => void;
}
const RowContext = createContext<RowContext>({
  canWrite: false,
  isSuperAdmin: false,
  isSelected: () => false,
  toggle: () => {},
  pageRows: [],
  togglePage: () => {},
});

// Ommaviy tahrir uchun tanlash (D-017) — faqat yozuvchilarga
const selectColumn = col.display({
  id: 'select',
  size: 44,
  header: () => <SelectPageCheckbox />,
  cell: ({ row }) => <SelectRowCheckbox row={row.original} />,
});

const productColumn = col.accessor((r) => r.product.name, {
  id: 'product',
  header: 'Mahsulot',
  size: 280,
  cell: ({ row }) => (
    <Link to={`/products/${row.original.product.id}`} className={`font-medium hover:underline ${row.original.product.isActive ? '' : 'text-muted'}`}>
      {row.original.product.name}
      {!row.original.product.isActive && <span className="ml-2 text-xs font-normal">(katalogda o‘chirilgan)</span>}
    </Link>
  ),
});
const branchColumn = col.accessor((r) => r.branch.name, {
  id: 'branch',
  header: 'Filial',
  size: 160,
  cell: ({ row }) => (
    <span>
      {row.original.branch.name} <span className="text-xs text-muted">· {row.original.branch.city}</span>
    </span>
  ),
});
const restColumns: DataTableColumn<BranchPrice>[] = [
  col.accessor('pricePerSqm', {
    header: 'Narx, so‘m/m²',
    size: 230,
    meta: { align: 'right' },
    cell: ({ row }) => <PriceCellWithContext row={row.original} />,
  }),
  col.accessor('isActive', {
    header: 'Holat',
    size: 170,
    cell: ({ row }) => <ActiveCell row={row.original} />,
  }),
  col.accessor('updatedAt', {
    header: 'Yangilangan',
    size: 150,
    cell: (c) => <DateText value={c.getValue()} />,
  }),
];

const branchColumns: DataTableColumn<BranchPrice>[] = [productColumn, ...restColumns];
const allBranchColumns: DataTableColumn<BranchPrice>[] = [productColumn, branchColumn, ...restColumns];
const writerBranchColumns: DataTableColumn<BranchPrice>[] = [selectColumn, ...branchColumns];
const writerAllBranchColumns: DataTableColumn<BranchPrice>[] = [selectColumn, ...allBranchColumns];

const activeOptions = [
  { value: 'true', label: 'Sotiladi' },
  { value: 'false', label: 'Sotilmaydi' },
] as const;

/**
 * Filial narxlari (D-016). 🔒 G5: filial tanlagich FAQAT SUPER_ADMIN ga;
 * filial admini/menejeri o'z filialini ko'radi — backend tokendan biladi.
 * Begona yozuv — 404, UI "topilmadi" deydi.
 */
export default function PricesPage() {
  const isSuperAdmin = useProfile().data?.role === 'SUPER_ADMIN';
  const canWrite = useCan('prices.write');
  const list = useListParams<PriceFilters>(isSuperAdmin ? superAdminPriceConfig : branchPriceConfig);
  const prices = useBranchPrices(list.params);
  const branches = useBranches(isSuperAdmin);
  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  // Tanlov filtr/filialga bog'liq: ular o'zgarsa tanlov avtomatik bo'shaydi
  const selectionScope = JSON.stringify(list.params.filters);
  const [selection, setSelection] = useState<{ scope: string; rows: Map<string, BranchPrice> }>({
    scope: selectionScope,
    rows: new Map(),
  });
  const selected = selection.scope === selectionScope ? selection.rows : EMPTY_SELECTION;
  const { branchId, productId, isActive } = list.params.filters;
  const product = useProductName(productId);
  const page = prices.data;

  const selectedBranch = branches.data?.find((b) => b.id === branchId);
  // SUPER_ADMIN narx qo'shishi uchun filial tanlangan bo'lishi SHART (backend 400)
  const addBlockedReason = isSuperAdmin && !selectedBranch ? 'Avval filialni tanlang' : null;
  const pageRows = page?.items ?? EMPTY_ROWS;
  const rowContext = useMemo<RowContext>(() => {
    const update = (fn: (rows: Map<string, BranchPrice>) => void) => {
      const rows = new Map(selected);
      fn(rows);
      setSelection({ scope: selectionScope, rows });
    };
    return {
      canWrite,
      isSuperAdmin,
      pageRows,
      isSelected: (id) => selected.has(id),
      toggle: (row) => update((rows) => (rows.has(row.id) ? rows.delete(row.id) : rows.set(row.id, row))),
      togglePage: (select) =>
        update((rows) => {
          for (const row of pageRows) {
            if (select) rows.set(row.id, row);
            else rows.delete(row.id);
          }
        }),
    };
  }, [canWrite, isSuperAdmin, pageRows, selected, selectionScope]);
  const clearSelection = () => setSelection({ scope: selectionScope, rows: new Map() });

  return (
    <RowContext value={rowContext}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {isSuperAdmin
            ? 'Filiallarning bazaviy narxlari (1 m² uchun). Mijozga individual narx qoidalari bu yerda ko‘rinmaydi.'
            : 'Filialingizning bazaviy narxlari (1 m² uchun). Narx o‘zgarishi eski buyurtmalarga ta’sir qilmaydi.'}
        </p>

        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <FilterBar
            hasFilters={list.hasFilters}
            onReset={list.resetFilters}
            actions={
              canWrite && (
                <Button
                  variant="primary"
                  onClick={() => (addBlockedReason ? toast.info(addBlockedReason) : setAdding(true))}
                  aria-disabled={addBlockedReason ? true : undefined}
                  title={addBlockedReason ?? undefined}
                  className={addBlockedReason ? 'opacity-50' : ''}
                >
                  <Plus size={16} aria-hidden />
                  Narx qo‘shish
                </Button>
              )
            }
          >
            {isSuperAdmin && (
              <FilterSelect
                label="Filial"
                value={branchId}
                onChange={(v) => list.setFilter('branchId', v)}
                loading={branches.isPending}
                allLabel="Barcha filiallar"
                options={(branches.data ?? []).map((b) => ({
                  value: b.id,
                  label: `${b.name}${b.type === 'CENTRAL' ? ' (markaziy ombor)' : ''}${b.isActive ? '' : ' — yopilgan'}`,
                }))}
              />
            )}
            <FilterSelect label="Holat" value={isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
            {productId && (
              <span className="inline-flex h-9 items-center gap-2 self-end rounded-md bg-surface-muted pr-1 pl-3 text-sm">
                Mahsulot: <strong className="font-medium">{product ?? '…'}</strong>
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
          </FilterBar>
        </div>

        {canWrite && selected.size > 0 && (
          <div role="region" aria-label="Tanlangan narxlar" className="flex flex-wrap items-center gap-3 rounded-lg border border-accent bg-surface-muted px-4 py-2 text-sm">
            <span>
              <strong className="tabular-nums">{selected.size}</strong> ta narx tanlandi
            </span>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Tanlovni bekor qilish
            </Button>
            <Button size="sm" variant="primary" className="ml-auto" onClick={() => setBulkOpen(true)}>
              Narxni o‘zgartirish
            </Button>
          </div>
        )}

        <DataTable
          caption="Filial narxlari"
          columns={
            isSuperAdmin && !branchId
              ? canWrite ? writerAllBranchColumns : allBranchColumns
              : canWrite ? writerBranchColumns : branchColumns
          }
          data={page?.items}
          getRowId={(r) => r.id}
          isLoading={prices.isPending}
          isFetching={prices.isPlaceholderData}
          error={prices.error}
          onRetry={() => void prices.refetch()}
          emptyText={list.hasFilters ? 'Filtrga mos narx topilmadi' : 'Hozircha narx kiritilmagan'}
          footer={
            page && (
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                total={page.total}
                limit={list.params.limit}
                onPageChange={list.setPage}
                onLimitChange={list.setLimit}
                disabled={prices.isPlaceholderData}
              />
            )
          }
        />

        {canWrite && (
          <BulkPriceModal
            open={bulkOpen}
            // Tanlangandan keyin joyida tahrirlangan bo'lsa — sahifadagi YANGI narx olinadi
            rows={[...selected.values()].map((r) => pageRows.find((p) => p.id === r.id) ?? r)}
            onClose={() => setBulkOpen(false)}
            onFinished={clearSelection}
          />
        )}
        {canWrite && (
          <AddPriceModal
            open={adding}
            onClose={() => setAdding(false)}
            branch={isSuperAdmin && selectedBranch ? { id: selectedBranch.id, name: selectedBranch.name } : undefined}
          />
        )}
      </div>
    </RowContext>
  );
}

const EMPTY_SELECTION = new Map<string, BranchPrice>();
const EMPTY_ROWS: BranchPrice[] = [];

function SelectPageCheckbox() {
  const { pageRows, isSelected, togglePage } = use(RowContext);
  const count = pageRows.filter((r) => isSelected(r.id)).length;
  const all = pageRows.length > 0 && count === pageRows.length;
  return (
    <input
      type="checkbox"
      aria-label="Sahifadagi barcha narxlarni tanlash"
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = count > 0 && !all;
      }}
      onChange={() => togglePage(!all)}
      className="size-4 accent-accent"
    />
  );
}

function SelectRowCheckbox({ row }: { row: BranchPrice }) {
  const { isSelected, toggle } = use(RowContext);
  return (
    <input
      type="checkbox"
      aria-label={`${row.product.name} — tanlash`}
      checked={isSelected(row.id)}
      onChange={() => toggle(row)}
      className="size-4 accent-accent"
    />
  );
}

/** Mahsulot filtri chipida nom — mahsulot kartasidan kelinganda. */
function useProductName(productId: string | undefined): string | undefined {
  const product = useProduct(productId ?? '');
  return productId ? product.data?.name : undefined;
}

function PriceCellWithContext({ row }: { row: BranchPrice }) {
  const { canWrite } = use(RowContext);
  return <PriceCell row={row} canEdit={canWrite} />;
}

function ActiveCell({ row }: { row: BranchPrice }) {
  const { canWrite, isSuperAdmin } = use(RowContext);
  const upsert = useUpsertPrice();
  const badge = row.isActive ? <Badge tone="success">Sotiladi</Badge> : <Badge tone="neutral">Sotilmaydi</Badge>;
  if (!canWrite) return badge;
  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <IconButton
        label={row.isActive ? `${row.product.name} — sotuvdan olish` : `${row.product.name} — sotuvga qaytarish`}
        disabled={upsert.isPending}
        onClick={() =>
          upsert.mutate(toggleActiveBody(row, isSuperAdmin), {
            onSuccess: () => toast.success(row.isActive ? 'Mahsulot bu filialda sotuvdan olindi' : 'Mahsulot yana sotuvda'),
            onError: toast.error,
          })
        }
      >
        {row.isActive ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
      </IconButton>
    </span>
  );
}
