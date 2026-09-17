import { Lock, Pencil, Plus, Unlock, Warehouse } from 'lucide-react';
import { createContext, use, useState } from 'react';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useBranchList, useCloseBranch, useUpdateBranch, type BranchFilters } from '@/features/branches/api';
import type { Branch } from '@/features/branches/branch-form';
import { BranchFormModal } from '@/features/branches/BranchFormModal';
import { errorMessage } from '@/shared/lib/error-message';
import { branchTypeLabel } from '@/shared/lib/labels';
import { useListParams } from '@/shared/lib/use-list-params';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterSelect,
  IconButton,
  tableColumns,
  Thumb,
  toast,
  type DataTableColumn,
} from '@/shared/ui';

const config: ListParamsConfig<BranchFilters> = { filterKeys: ['type', 'isActive'] };

const col = tableColumns<Branch>();

type Actions = { edit: (b: Branch) => void; toggle: ((b: Branch) => void) | null; canEdit: (b: Branch) => boolean };
const ActionsContext = createContext<Actions | null>(null);

const columns: DataTableColumn<Branch>[] = [
  col.accessor('name', {
    header: 'Filial',
    size: 260,
    cell: ({ row }) => {
      const b = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={b.buildingImageUrl} name={b.name} alt="" />
          <div className="min-w-0">
            <p className={`truncate font-medium ${b.isActive ? '' : 'text-muted'}`}>{b.name}</p>
            <p className="truncate text-xs text-muted">{b.city}</p>
          </div>
        </div>
      );
    },
  }),
  col.accessor('type', {
    header: 'Turi',
    size: 160,
    // CENTRAL va RETAIL TENG EMAS: markazda zaxira bor, do'konda faqat narx
    cell: (c) =>
      c.getValue() === 'CENTRAL' ? (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-sm bg-info-soft px-2 text-xs font-medium text-info">
          <Warehouse size={12} aria-hidden />
          {branchTypeLabel.CENTRAL}
        </span>
      ) : (
        <Badge tone="neutral">{branchTypeLabel.RETAIL}</Badge>
      ),
  }),
  col.accessor('address', {
    header: 'Manzil va ish vaqti',
    size: 260,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate">{row.original.address}</p>
        <p className="truncate text-xs text-muted">{row.original.workingHours}</p>
      </div>
    ),
  }),
  col.accessor('phones', {
    header: 'Telefon',
    size: 170,
    cell: (c) => (
      <ul className="flex flex-col">
        {c.getValue().map((p: string) => (
          <li key={p}>
            <a href={`tel:${p.replace(/[^\d+]/g, '')}`} className="whitespace-nowrap tabular-nums hover:underline">
              {p}
            </a>
          </li>
        ))}
      </ul>
    ),
  }),
  col.accessor('isActive', {
    header: 'Holat',
    size: 100,
    cell: (c) => (c.getValue() ? <Badge tone="success">Ochiq</Badge> : <Badge tone="neutral">Yopilgan</Badge>),
  }),
  col.display({
    id: 'actions',
    size: 90,
    header: () => <span className="sr-only">Amallar</span>,
    meta: { align: 'right' },
    cell: ({ row }) => <RowActions branch={row.original} />,
  }),
];

const typeOptions = (['RETAIL', 'CENTRAL'] as const).map((value) => ({ value, label: branchTypeLabel[value] }));
const activeOptions = [
  { value: 'true', label: 'Ochiq' },
  { value: 'false', label: 'Yopilgan' },
] as const;

/**
 * Filiallar (D-033). 🔒 Yaratish, yopish/ochish — faqat SUPER_ADMIN;
 * tahrirlash — filial admini va moderatorga ham, lekin faqat O'Z filiali va
 * faqat kontaktlar. Filial xodimi ro'yxatda faqat o'z filialini ko'radi (backend).
 */
export default function BranchesPage() {
  const profile = useProfile().data;
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const canCreate = useCan('branches.create');
  const canEditAny = useCan('branches.edit');
  const list = useListParams<BranchFilters>(config);
  const branches = useBranchList(list.params.filters);

  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [toggling, setToggling] = useState<Branch | null>(null);
  const close = useCloseBranch();
  const reopen = useUpdateBranch();
  const togglePending = close.isPending || reopen.isPending;
  const toggleError = close.error ?? reopen.error;

  const actions: Actions = {
    edit: setEditing,
    toggle: isSuperAdmin ? setToggling : null,
    // Filial admini / moderator — faqat o'z filiali (backend baribir tekshiradi)
    canEdit: (b) => canEditAny && (isSuperAdmin || b.id === profile?.branchId),
  };

  const resetToggle = () => {
    setToggling(null);
    close.reset();
    reopen.reset();
  };

  return (
    <ActionsContext value={actions}>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <FilterBar
            hasFilters={list.hasFilters}
            onReset={list.resetFilters}
            actions={
              canCreate && (
                <Button variant="primary" onClick={() => setEditing('new')}>
                  <Plus size={16} aria-hidden />
                  Yangi filial
                </Button>
              )
            }
          >
            <FilterSelect label="Turi" value={list.params.filters.type} onChange={(v) => list.setFilter('type', v)} options={typeOptions} />
            <FilterSelect label="Holat" value={list.params.filters.isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
          </FilterBar>
        </div>

        <DataTable
          caption="Filiallar"
          columns={columns}
          data={branches.data}
          getRowId={(b) => b.id}
          isLoading={branches.isPending}
          error={branches.error}
          onRetry={() => void branches.refetch()}
          rowClassName={(b) => (b.type === 'CENTRAL' ? 'bg-info-soft/30' : '')}
          emptyText={list.hasFilters ? 'Filtrga mos filial topilmadi' : 'Hozircha filial yo‘q'}
        />

        <BranchFormModal
          open={editing !== null}
          branch={editing === 'new' || editing === null ? undefined : editing}
          fullAccess={isSuperAdmin}
          onClose={() => setEditing(null)}
        />

        {toggling && (
          <ConfirmDialog
            open
            onClose={resetToggle}
            danger={toggling.isActive}
            title={toggling.isActive ? `“${toggling.name}” filialini yopish?` : `“${toggling.name}” filialini qayta ochish?`}
            description={
              toggling.isActive
                ? 'Filial saytda ko‘rinmaydi, uning mijozlari buyurtma bera olmaydi. Buyurtmalar, narxlar va tarix saqlanadi.'
                : 'Filial yana saytda ko‘rinadi va mijozlari buyurtma bera oladi.'
            }
            confirmText={toggling.isActive ? 'Yopish' : 'Ochish'}
            pending={togglePending}
            error={toggleError ? errorMessage(toggleError) : undefined}
            onConfirm={() => {
              const done = (text: string) => () => {
                toast.success(text);
                resetToggle();
              };
              if (toggling.isActive) close.mutate(toggling.id, { onSuccess: done('Filial yopildi') });
              else reopen.mutate({ id: toggling.id, body: { isActive: true } }, { onSuccess: done('Filial qayta ochildi') });
            }}
          />
        )}
      </div>
    </ActionsContext>
  );
}

function RowActions({ branch }: { branch: Branch }) {
  const actions = use(ActionsContext);
  if (!actions) return null;
  return (
    <div className="flex justify-end gap-1">
      {actions.canEdit(branch) && (
        <IconButton label={`${branch.name} — tahrirlash`} onClick={() => actions.edit(branch)}>
          <Pencil size={15} aria-hidden />
        </IconButton>
      )}
      {actions.toggle && (
        <IconButton label={branch.isActive ? `${branch.name} — yopish` : `${branch.name} — qayta ochish`} onClick={() => actions.toggle?.(branch)} danger={branch.isActive}>
          {branch.isActive ? <Lock size={15} aria-hidden /> : <Unlock size={15} aria-hidden />}
        </IconButton>
      )}
    </div>
  );
}
