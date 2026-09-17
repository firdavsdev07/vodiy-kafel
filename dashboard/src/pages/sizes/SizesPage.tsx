import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createContext, use, useMemo, useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import { useDeleteSize, useSizes } from '@/features/sizes/api';
import type { Size } from '@/features/sizes/size-form';
import { SizeFormModal } from '@/features/sizes/SizeFormModal';
import { errorMessage } from '@/shared/lib/error-message';
import {
  Button,
  ConfirmDialog,
  DataTable,
  IconButton,
  tableColumns,
  toast,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<Size>();

interface RowActions {
  edit: (size: Size) => void;
  remove: (size: Size) => void;
}

const RowActionsContext = createContext<RowActions | null>(null);

const readerColumns: DataTableColumn<Size>[] = [
  col.accessor('label', {
    header: 'O‘lcham',
    size: 160,
    cell: (c) => <span className="font-medium tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('widthCm', {
    header: 'Eni, sm',
    size: 100,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('heightCm', {
    header: 'Bo‘yi, sm',
    size: 100,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('productCount', {
    header: 'Mahsulotlar',
    size: 120,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('sortOrder', {
    header: 'Tartib',
    size: 80,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums text-muted">{c.getValue()}</span>,
  }),
];

const writerColumns: DataTableColumn<Size>[] = [
  ...readerColumns,
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Amallar</span>,
    size: 100,
    meta: { align: 'right' },
    cell: ({ row }) => <SizeRowActions size={row.original} />,
  }),
];

type Dialog = { type: 'create' } | { type: 'edit'; size: Size } | { type: 'delete'; size: Size } | null;

/**
 * O'lchamlar (D-010) — katalog filtri uchun ma'lumotnoma. Paddondagi m² va
 * og'irlik o'lchamda EMAS, mahsulotda (D-012).
 * 🔒 Ko'rish — barcha xodim; yozish — faqat SUPER_ADMIN.
 */
export default function SizesPage() {
  const canWrite = useCan('catalog.write');
  const sizes = useSizes();
  const remove = useDeleteSize();
  const [dialog, setDialog] = useState<Dialog>(null);

  const actions = useMemo<RowActions>(
    () => ({
      edit: (size) => setDialog({ type: 'edit', size }),
      remove: (size) => setDialog({ type: 'delete', size }),
    }),
    [],
  );

  const deleting = dialog?.type === 'delete' ? dialog.size : undefined;
  const closeDelete = () => {
    setDialog(null);
    remove.reset();
  };

  return (
    <RowActionsContext value={actions}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted">
            Katalog filtridagi o‘lchamlar. Mahsuloti bor o‘lchamni o‘chirib bo‘lmaydi.
          </p>
          {canWrite && (
            <Button variant="primary" onClick={() => setDialog({ type: 'create' })}>
              <Plus size={16} aria-hidden />
              Yangi o‘lcham
            </Button>
          )}
        </div>

        <DataTable
          caption="O‘lchamlar"
          columns={canWrite ? writerColumns : readerColumns}
          data={sizes.data}
          getRowId={(s) => s.id}
          isLoading={sizes.isPending}
          isFetching={sizes.isFetching && !sizes.isPending}
          error={sizes.error}
          onRetry={() => void sizes.refetch()}
          onRowClick={canWrite ? (size) => setDialog({ type: 'edit', size }) : undefined}
          emptyText="Hozircha o‘lcham qo‘shilmagan"
          skeletonRows={6}
          footer={
            sizes.data && sizes.data.length > 0 ? (
              <p className="border-t border-line px-4 py-3 text-sm text-muted tabular-nums">
                Jami {sizes.data.length} ta
              </p>
            ) : undefined
          }
        />

        {canWrite && (
          <>
            <SizeFormModal
              open={dialog?.type === 'create' || dialog?.type === 'edit'}
              size={dialog?.type === 'edit' ? dialog.size : undefined}
              onClose={() => setDialog(null)}
            />
            <ConfirmDialog
              open={Boolean(deleting)}
              onClose={closeDelete}
              danger
              title={`“${deleting?.label ?? ''}” o‘lchamini o‘chirish?`}
              description="O‘lcham butunlay o‘chiriladi — qaytarib bo‘lmaydi."
              confirmText="O‘chirish"
              pending={remove.isPending}
              // 409: "Bu o'lchamda N ta mahsulot bor — avval ularning o'lchamini o'zgartiring"
              error={remove.error ? errorMessage(remove.error) : undefined}
              onConfirm={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(`“${deleting.label}” o‘chirildi`);
                    setDialog(null);
                  },
                })
              }
            />
          </>
        )}
      </div>
    </RowActionsContext>
  );
}

function SizeRowActions({ size }: { size: Size }) {
  const actions = use(RowActionsContext);
  if (!actions) return null;
  const blocked = size.productCount > 0;
  return (
    <div className="flex justify-end gap-1">
      <IconButton label={`${size.label} — tahrirlash`} onClick={() => actions.edit(size)}>
        <Pencil size={15} aria-hidden />
      </IconButton>
      <IconButton
        label={blocked ? `${size.label} — ${size.productCount} ta mahsulot bor, o‘chirib bo‘lmaydi` : `${size.label} — o‘chirish`}
        onClick={() =>
          blocked
            ? toast.info(`“${size.label}” o‘lchamida ${size.productCount} ta mahsulot bor — avval ularning o‘lchamini o‘zgartiring`)
            : actions.remove(size)
        }
        inactive={blocked}
        danger
      >
        <Trash2 size={15} aria-hidden />
      </IconButton>
    </div>
  );
}
