import { useTable, type RowData, type SortingState } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { SortOrder } from '@/shared/lib/list-params';
import { dataTableFeatures, type DataTableColumn } from './data-table';
import { nextIndex } from '@/shared/lib/keyboard';
import { ErrorState } from './ErrorState';

export interface DataTableSort {
  sortBy: string | undefined;
  sortOrder: SortOrder | undefined;
}

/**
 * Umumiy jadval (D-008): server tomonda saralash, ustun kengligi (`size`),
 * yuklanish skeleti, bo'sh holat, xato holati, qator bosilganda navigatsiya.
 * Sahifalash — `footer` ga `<Pagination>` qo'yiladi.
 *
 * Saralanadigan ustun: `enableSorting: true` (standart — o'chiq, chunki
 * backend faqat ma'lum maydonlar bo'yicha saralaydi).
 */
export function DataTable<T extends RowData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  sort,
  onSortChange,
  rowHref,
  onRowClick,
  emptyText = 'Hozircha hech narsa yo‘q',
  emptyAction,
  skeletonRows = 8,
  footer,
  caption,
  rowClassName,
}: {
  columns: readonly DataTableColumn<T>[];
  data: readonly T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  /** Fonda yangilanmoqda (sahifa almashdi) — eski qatorlar xiralashadi */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Qator bosilganda o'tiladigan manzil (Ctrl/Cmd+bosish — yangi tab) */
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  emptyAction?: ReactNode;
  skeletonRows?: number;
  footer?: ReactNode;
  /** Ekran o'quvchi uchun jadval nomi */
  caption?: string;
  /** Qatorni vizual ajratish (masalan tezkor buyurtma). Rang yagona signal bo'lmasin — katakda matn/belgi ham bo'lsin */
  rowClassName?: (row: T) => string;
}) {
  const navigate = useNavigate();
  const sorting: SortingState = sort?.sortBy
    ? [{ id: sortColumnId(columns, sort.sortBy), desc: sort.sortOrder === 'desc' }]
    : [];

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: data as T[] | undefined ?? EMPTY,
    getRowId: (row) => getRowId(row),
    manualSorting: true,
    enableMultiSort: false,
    // Ustun o'zi `enableSorting: true` demasa — saralanmaydi (jadval darajasida
    // `false` qo'yilsa ustundagi `true` ham bekor bo'ladi)
    defaultColumn: { enableSorting: false },
    // Backend "saralashsiz" holatni o'z standartida qaytaradi: asc → desc → yo'q
    sortDescFirst: false,
    state: { sorting },
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const first = next[0];
      const column = first ? table.getColumn(first.id) : undefined;
      onSortChange(
        first
          ? { sortBy: column?.columnDef.meta?.sortKey ?? first.id, sortOrder: first.desc ? 'desc' : 'asc' }
          : { sortBy: undefined, sortOrder: undefined },
      );
    },
  });

  const clickable = Boolean(rowHref || onRowClick);
  const openRow = (row: T, event: MouseEvent | KeyboardEvent) => {
    // Qator ichidagi tugma/havola o'z ishini qilsin
    if ((event.target as HTMLElement).closest('a,button,input,select,textarea,label')) return;
    if (rowHref) {
      const href = rowHref(row);
      if (event.metaKey || event.ctrlKey) window.open(href, '_blank', 'noopener');
      else void navigate(href);
    } else onRowClick?.(row);
  };

  // Klaviatura (D-044): Enter — ochish; ↑/↓, Home/End — qatorlar orasida fokus
  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === 'Enter') return openRow(row, event);
    const current = event.currentTarget;
    const siblings = Array.from(current.parentElement?.querySelectorAll<HTMLTableRowElement>('tr[tabindex]') ?? []);
    const target = nextIndex(event.key, siblings.indexOf(current), siblings.length);
    if (target === null) return;
    event.preventDefault();
    siblings[target]?.focus();
  };

  const headerGroups = table.getHeaderGroups();
  const columnCount = table.getAllLeafColumns().length;
  const rows = table.getRowModel().rows;

  let body: ReactNode;
  if (error && !data) {
    body = (
      <tr>
        <td colSpan={columnCount}>
          <ErrorState error={error} onRetry={onRetry} retrying={isFetching} compact />
        </td>
      </tr>
    );
  } else if (isLoading) {
    body = Array.from({ length: skeletonRows }, (_, i) => (
      <tr key={i} aria-hidden className="border-b border-line last:border-0">
        {table.getAllLeafColumns().map((column, c) => (
          <td key={column.id} className="px-4 py-3">
            <div className="h-4 animate-pulse rounded-sm bg-surface-muted" style={{ width: `${55 + ((i * 7 + c * 13) % 40)}%` }} />
          </td>
        ))}
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={columnCount}>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Inbox size={22} className="text-muted" aria-hidden />
            <p className="text-sm text-muted">{emptyText}</p>
            {emptyAction}
          </div>
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr
        key={row.id}
        onClick={clickable ? (e) => openRow(row.original, e) : undefined}
        onKeyDown={clickable ? (e) => onRowKeyDown(e, row.original) : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={`border-b border-line last:border-0 ${clickable ? 'cursor-pointer hover:bg-surface-muted focus-visible:bg-surface-muted' : ''} ${rowClassName?.(row.original) ?? ''}`}
      >
        {row.getAllCells().map((cell) => (
          <td key={cell.id} className={`px-4 py-2.5 ${alignClass(cell.column.columnDef.meta?.align)}`}>
            <table.FlexRender cell={cell} />
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="overflow-x-auto">
        <table
          aria-busy={isLoading || isFetching || undefined}
          className={`w-full border-collapse text-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}
          style={{ minWidth: table.getTotalSize() }}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-line bg-surface-muted/60">
            {headerGroups.map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const column = header.column;
                  const canSort = Boolean(onSortChange) && column.getCanSort();
                  const sorted = column.getIsSorted();
                  const meta = column.columnDef.meta;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={{ width: header.getSize() }}
                      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`h-10 px-4 text-xs font-medium whitespace-nowrap text-muted ${alignClass(meta?.align)}`}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className={`inline-flex items-center gap-1 hover:text-fg ${sorted ? 'text-fg' : ''}`}
                        >
                          <table.FlexRender header={header} />
                          {sorted === 'asc' ? (
                            <ArrowUp size={13} aria-hidden />
                          ) : sorted === 'desc' ? (
                            <ArrowDown size={13} aria-hidden />
                          ) : (
                            <ArrowUpDown size={13} className="opacity-50" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

const EMPTY: never[] = [];

function alignClass(align: 'left' | 'right' | 'center' | undefined): string {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
}

/** Backend `sortBy` → ustun id (`meta.sortKey` orqali moslashtirilgan bo'lsa). */
function sortColumnId<T extends RowData>(
  columns: readonly DataTableColumn<T>[],
  sortBy: string): string {
  for (const column of columns) {
    const def = column as { id?: string; accessorKey?: string; meta?: { sortKey?: string } };
    if (def.meta?.sortKey === sortBy) return def.id ?? def.accessorKey ?? sortBy;
  }
  return sortBy;
}
