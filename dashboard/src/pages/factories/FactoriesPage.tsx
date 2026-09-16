import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { createContext, use, useMemo, useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import { useDeleteFactory, useFactories, useUpdateFactory } from '@/features/factories/api';
import type { Factory } from '@/features/factories/factory-form';
import { FactoryFormModal } from '@/features/factories/FactoryFormModal';
import { errorMessage } from '@/shared/lib/error-message';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  IconButton,
  tableColumns,
  Thumb,
  toast,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<Factory>();

interface RowActions {
  edit: (factory: Factory) => void;
  remove: (factory: Factory) => void;
  restore: (factory: Factory) => void;
  restoring: boolean;
}

/** Ustunlar modul darajasida (barqaror) — qator amallari context orqali keladi. */
const RowActionsContext = createContext<RowActions | null>(null);

const readerColumns: DataTableColumn<Factory>[] = [
  col.accessor('name', {
    header: 'Zavod',
    size: 280,
    cell: ({ row }) => <FactoryName factory={row.original} />,
  }),
  col.accessor('slug', {
    header: 'URL',
    size: 160,
    cell: (c) => <code className="font-mono text-xs text-muted">{c.getValue()}</code>,
  }),
  col.accessor('productCount', {
    header: 'Mahsulotlar',
    size: 110,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
  }),
  col.accessor('sortOrder', {
    header: 'Tartib',
    size: 80,
    meta: { align: 'right' },
    cell: (c) => <span className="tabular-nums text-muted">{c.getValue()}</span>,
  }),
  col.accessor('isActive', {
    header: 'Holat',
    size: 120,
    cell: (c) =>
      c.getValue() ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">O‘chirilgan</Badge>,
  }),
];

const writerColumns: DataTableColumn<Factory>[] = [
  ...readerColumns,
  col.display({
    id: 'actions',
    header: () => <span className="sr-only">Amallar</span>,
    size: 110,
    meta: { align: 'right' },
    cell: ({ row }) => <FactoryRowActions factory={row.original} />,
  }),
];

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; factory: Factory }
  | { type: 'delete'; factory: Factory }
  | null;

/**
 * Zavodlar (D-009) — birinchi to'liq CRUD sahifa, keyingilar uchun namuna.
 * 🔒 Ko'rish — barcha xodim; yozish — faqat SUPER_ADMIN (`catalog.write`).
 */
export default function FactoriesPage() {
  const canWrite = useCan('catalog.write');
  const factories = useFactories();
  const remove = useDeleteFactory();
  const restore = useUpdateFactory();
  const [dialog, setDialog] = useState<Dialog>(null);

  const actions = useMemo<RowActions>(
    () => ({
      edit: (factory) => setDialog({ type: 'edit', factory }),
      remove: (factory) => setDialog({ type: 'delete', factory }),
      restore: (factory) =>
        restore.mutate(
          { id: factory.id, body: { isActive: true } },
          {
            onSuccess: () => toast.success(`"${factory.name}" qayta faollashtirildi`),
            onError: toast.error,
          },
        ),
      restoring: restore.isPending,
    }),
    [restore],
  );

  const data = factories.data;
  const active = data?.filter((f) => f.isActive).length ?? 0;
  const deleting = dialog?.type === 'delete' ? dialog.factory : undefined;

  return (
    <RowActionsContext value={actions}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted">
            Zavodlar barcha filiallar uchun umumiy. O‘chirilgan zavod va uning mahsulotlari ochiq katalogda
            ko‘rinmaydi.
          </p>
          {canWrite && (
            <Button variant="primary" onClick={() => setDialog({ type: 'create' })}>
              <Plus size={16} aria-hidden />
              Yangi zavod
            </Button>
          )}
        </div>

        <DataTable
          caption="Zavodlar"
          columns={canWrite ? writerColumns : readerColumns}
          data={data}
          getRowId={(f) => f.id}
          isLoading={factories.isPending}
          isFetching={factories.isFetching && !factories.isPending}
          error={factories.error}
          onRetry={() => void factories.refetch()}
          onRowClick={canWrite ? (factory) => setDialog({ type: 'edit', factory }) : undefined}
          emptyText="Hozircha zavod qo‘shilmagan"
          emptyAction={
            canWrite ? (
              <Button size="sm" onClick={() => setDialog({ type: 'create' })}>
                <Plus size={14} aria-hidden />
                Birinchi zavodni qo‘shish
              </Button>
            ) : undefined
          }
          skeletonRows={6}
          footer={
            data && data.length > 0 ? (
              <p className="border-t border-line px-4 py-3 text-sm text-muted tabular-nums">
                Jami {data.length} ta · faol {active} ta
              </p>
            ) : undefined
          }
        />

        {canWrite && (
          <>
            <FactoryFormModal
              open={dialog?.type === 'create' || dialog?.type === 'edit'}
              factory={dialog?.type === 'edit' ? dialog.factory : undefined}
              onClose={() => setDialog(null)}
            />
            <ConfirmDialog
              open={Boolean(deleting)}
              onClose={() => {
                setDialog(null);
                remove.reset();
              }}
              danger
              title={`"${deleting?.name ?? ''}" zavodini o‘chirish?`}
              description={
                deleting && deleting.productCount > 0 ? (
                  <>
                    Zavodning <strong className="text-fg">{deleting.productCount} ta mahsuloti</strong> ochiq katalogdan
                    yashiriladi. Buyurtmalar tarixi saqlanadi, zavodni keyin qayta faollashtirish mumkin.
                  </>
                ) : (
                  'Zavod ochiq katalogdan yashiriladi. Keyin qayta faollashtirish mumkin.'
                )
              }
              confirmText="O‘chirish"
              pending={remove.isPending}
              error={remove.error ? errorMessage(remove.error) : undefined}
              onConfirm={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(`"${deleting.name}" o‘chirildi`);
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

function FactoryName({ factory }: { factory: Factory }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Thumb src={factory.logoUrl} name={factory.name} />
      <span className={`truncate font-medium ${factory.isActive ? '' : 'text-muted'}`}>{factory.name}</span>
    </div>
  );
}

function FactoryRowActions({ factory }: { factory: Factory }) {
  const actions = use(RowActionsContext);
  if (!actions) return null;
  return (
    <div className="flex justify-end gap-1">
      <IconButton label={`${factory.name} — tahrirlash`} onClick={() => actions.edit(factory)}>
        <Pencil size={15} aria-hidden />
      </IconButton>
      {factory.isActive ? (
        <IconButton label={`${factory.name} — o‘chirish`} onClick={() => actions.remove(factory)} danger>
          <Trash2 size={15} aria-hidden />
        </IconButton>
      ) : (
        <IconButton
          label={`${factory.name} — qayta faollashtirish`}
          disabled={actions.restoring}
          onClick={() => actions.restore(factory)}
        >
          <RotateCcw size={15} aria-hidden />
        </IconButton>
      )}
    </div>
  );
}
