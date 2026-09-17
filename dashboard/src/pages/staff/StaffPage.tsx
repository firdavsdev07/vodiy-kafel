import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import { createContext, use, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import {
  useCreateManager,
  useCreateModerator,
  useDeactivateModerator,
  useManagerList,
  useModeratorList,
  useResetManagerPassword,
  useResetModeratorPassword,
  useUpdateManager,
  useUpdateModerator,
} from '@/features/staff/api';
import { useStaffPasswordFlow, type ResetPasswordMutation } from '@/features/staff/StaffPasswordFlow';
import { telegramHref, type Staff, type StaffFilters } from '@/features/staff/staff-form';
import { StaffFormModal, type CreateStaffMutation, type UpdateStaffMutation } from '@/features/staff/StaffFormModal';
import { errorMessage } from '@/shared/lib/error-message';
import { formatUzPhone } from '@/shared/lib/format';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterSelect,
  IconButton,
  tableColumns,
  TemporaryPasswordDialog,
  toast,
  type DataTableColumn,
  type SelectOption,
} from '@/shared/ui';

type View = 'managers' | 'moderators';

/**
 * Xodimlar: menejerlar (D-035 — SUPER_ADMIN, BRANCH_ADMIN) va moderatorlar
 * (D-036 — faqat SUPER_ADMIN). Bo'lim URL'da (`?view=`) — havola ulashsa bo'ladi.
 */
export default function StaffPage() {
  const canManagers = useCan('managers.manage');
  const canModerators = useCan('moderators.manage');
  const [search, setSearch] = useSearchParams();
  const requested = search.get('view') === 'moderators' ? 'moderators' : 'managers';
  const view: View = requested === 'moderators' && canModerators ? 'moderators' : canManagers ? 'managers' : 'moderators';

  return (
    <div className="flex flex-col gap-4">
      {canManagers && canModerators && (
        <div role="tablist" aria-label="Xodim turi" className="flex gap-1 border-b border-line">
          {(
            [
              ['managers', 'Menejerlar'],
              ['moderators', 'Moderatorlar'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setSearch(id === 'managers' ? {} : { view: id }, { replace: true })}
              className={`-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm ${
                view === id ? 'border-accent font-medium text-fg' : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {view === 'managers' ? <ManagersSection key="managers" /> : <ModeratorsSection key="moderators" />}
    </div>
  );
}

const config: ListParamsConfig<StaffFilters> = { filterKeys: ['search', 'isActive', 'branchId'] };
const activeOptions = [
  { value: 'true', label: 'Faol' },
  { value: 'false', label: 'Faolsiz' },
] as const;

type RowActionsApi = {
  edit: (s: Staff) => void;
  toggle: (s: Staff) => void;
  resetPassword: (s: Staff) => void;
};
const RowActionsContext = createContext<RowActionsApi | null>(null);

const col = tableColumns<Staff>();
const nameColumn = col.accessor('fullName', {
  header: 'Xodim',
  size: 220,
  cell: ({ row }) => <p className={`truncate font-medium ${row.original.isActive ? '' : 'text-muted'}`}>{row.original.fullName}</p>,
});
const contactColumns: DataTableColumn<Staff>[] = [
  col.accessor('phone', {
    header: 'Telefon (login)',
    size: 170,
    cell: (c) => (
      <a href={`tel:${c.getValue()}`} className="whitespace-nowrap tabular-nums hover:underline">
        {formatUzPhone(c.getValue())}
      </a>
    ),
  }),
  col.accessor('telegramUsername', {
    header: 'Telegram',
    size: 160,
    cell: (c) => {
      const v = c.getValue();
      return v ? (
        <a href={telegramHref(v)} target="_blank" rel="noopener noreferrer" className="hover:underline">
          @{v}
        </a>
      ) : (
        <span className="text-muted">—</span>
      );
    },
  }),
];
const branchColumn = col.accessor((s) => s.branch.name, { id: 'branch', header: 'Filial', size: 180 });
const tailColumns: DataTableColumn<Staff>[] = [
  col.accessor('isActive', {
    header: 'Holat',
    size: 100,
    cell: (c) => (c.getValue() ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">Faolsiz</Badge>),
  }),
  col.display({
    id: 'actions',
    size: 120,
    header: () => <span className="sr-only">Amallar</span>,
    meta: { align: 'right' },
    cell: ({ row }) => <RowActions staff={row.original} />,
  }),
];

/**
 * Menejerlar (D-035). 🔒 Filial admini faqat o'z filialini ko'radi va
 * qo'shadi — filial filtri/maydoni unga UMUMAN ko'rsatilmaydi (G5).
 * Biriktirish mantig'i hozircha BY_BRANCH (❓ B-043) — filial menejerlari orasida.
 */
function ManagersSection() {
  const isSuperAdmin = useProfile().data?.role === 'SUPER_ADMIN';
  const list = useListParams<StaffFilters>(config);
  // Filial admini uchun URL'dagi branchId o'qilmaydi
  const filters = isSuperAdmin ? list.params.filters : { ...list.params.filters, branchId: undefined };
  const managers = useManagerList(filters);
  const branches = useBranches(isSuperAdmin);
  const create = useCreateManager();
  const update = useUpdateManager();
  const resetPassword = useResetManagerPassword();
  // Menejer faqat do'kon (RETAIL) filialida — backend CENTRAL ni rad etadi
  const retail: SelectOption[] = (branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name, disabled: !b.isActive }));

  return (
    <StaffSection
      caption="Menejerlar"
      addLabel="Yangi menejer"
      emptyText="Hozircha menejer yo‘q"
      rows={managers}
      columns={isSuperAdmin ? [nameColumn, ...contactColumns, branchColumn, ...tailColumns] : [nameColumn, ...contactColumns, ...tailColumns]}
      list={list}
      branchFilter={isSuperAdmin ? { options: retail, loading: branches.isPending } : null}
      form={{
        title: { create: 'Yangi menejer', edit: 'tahrirlash' },
        branchOptions: isSuperAdmin ? retail : null,
        branchHint: 'Faqat do‘kon filiali. Boshqa filialga o‘tkazilsa — eski mijozlari unga biriktirilmay qoladi.',
        create: create as CreateStaffMutation,
        update: update as UpdateStaffMutation,
      }}
      resetPassword={resetPassword as ResetPasswordMutation}
      deactivateText="Menejer tizimga kira olmaydi va unga yangi buyurtma biriktirilmaydi. Biriktirilgan mijozlar va tarix saqlanadi."
    />
  );
}

/**
 * Moderatorlar (D-036) — markaziy ombor xodimlari. 🔒 FAQAT SUPER_ADMIN
 * (menyu va tab boshqa rolda ko'rinmaydi, backend ham 403). Forma faqat
 * CENTRAL filialni taklif qiladi — MODERATOR RETAIL ga biriktirilmaydi (B-057).
 */
function ModeratorsSection() {
  const list = useListParams<StaffFilters>(config);
  const moderators = useModeratorList(list.params.filters);
  const branches = useBranches(true);
  const create = useCreateModerator();
  const update = useUpdateModerator();
  const deactivate = useDeactivateModerator();
  const resetPassword = useResetModeratorPassword();
  const central: SelectOption[] = (branches.data ?? []).filter((b) => b.type === 'CENTRAL').map((b) => ({ value: b.id, label: b.name, disabled: !b.isActive }));

  return (
    <StaffSection
      caption="Moderatorlar"
      addLabel="Yangi moderator"
      emptyText="Hozircha moderator yo‘q"
      rows={moderators}
      columns={[nameColumn, ...contactColumns, { ...branchColumn, header: 'Markaziy ombor' }, ...tailColumns]}
      list={list}
      branchFilter={{ options: central, loading: branches.isPending }}
      form={{
        title: { create: 'Yangi moderator', edit: 'tahrirlash' },
        branchOptions: central,
        branchHint: 'Faqat markaziy ombor (CENTRAL). Do‘kon filialiga moderator biriktirilmaydi.',
        create: create as CreateStaffMutation,
        update: update as UpdateStaffMutation,
      }}
      resetPassword={resetPassword as ResetPasswordMutation}
      deactivate={deactivate}
      deactivateText="Moderator tizimga kira olmaydi. Hisob o‘chirilmaydi — u o‘zgartirgan holatlar va zaxira tarixi saqlanadi."
    />
  );
}

function StaffSection({
  caption,
  addLabel,
  emptyText,
  rows,
  columns,
  list,
  branchFilter,
  form,
  resetPassword,
  deactivate,
  deactivateText,
}: {
  caption: string;
  addLabel: string;
  emptyText: string;
  rows: { data?: Staff[]; isPending: boolean; error: unknown; refetch: () => unknown };
  columns: DataTableColumn<Staff>[];
  list: ReturnType<typeof useListParams<StaffFilters>>;
  branchFilter: { options: readonly SelectOption[]; loading: boolean } | null;
  form: {
    title: { create: string; edit: string };
    branchOptions: readonly SelectOption[] | null;
    branchHint?: string;
    create: CreateStaffMutation;
    update: UpdateStaffMutation;
  };
  /** Yangi parol berish (api B-066) — menejer va moderator uchun boshqa endpoint. */
  resetPassword: ResetPasswordMutation;
  /** Faolsizlantirish uchun alohida endpoint (moderator: DELETE, soft). Yo'q bo'lsa — PATCH `isActive: false`. */
  deactivate?: { mutate: (id: string, options: { onSuccess: () => void }) => void; isPending: boolean; error: unknown; reset: () => void };
  deactivateText: string;
}) {
  const [editing, setEditing] = useState<Staff | 'new' | null>(null);
  const [toggling, setToggling] = useState<Staff | null>(null);
  // 🔒 Vaqtinchalik parol FAQAT shu holatda — oyna yopilganda o'chadi
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);
  const passwordFlow = useStaffPasswordFlow(resetPassword);
  const { update } = form;

  return (
    <RowActionsContext value={{ edit: setEditing, toggle: setToggling, resetPassword: passwordFlow.request }}>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <FilterBar
            search={list.params.filters.search}
            onSearchChange={(v) => list.setFilter('search', v)}
            searchPlaceholder="Ism, telefon yoki Telegram…"
            hasFilters={list.hasFilters}
            onReset={list.resetFilters}
            actions={
              <Button variant="primary" onClick={() => setEditing('new')}>
                <Plus size={16} aria-hidden />
                {addLabel}
              </Button>
            }
          >
            {branchFilter && (
              <FilterSelect
                label="Filial"
                value={list.params.filters.branchId}
                onChange={(v) => list.setFilter('branchId', v)}
                loading={branchFilter.loading}
                allLabel="Barcha filiallar"
                options={branchFilter.options}
              />
            )}
            <FilterSelect label="Holat" value={list.params.filters.isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
          </FilterBar>
        </div>

        <DataTable
          caption={caption}
          columns={columns}
          data={rows.data}
          getRowId={(s) => s.id}
          isLoading={rows.isPending}
          error={rows.error}
          onRetry={() => void rows.refetch()}
          emptyText={list.hasFilters ? 'Filtrga mos xodim topilmadi' : emptyText}
        />

        <StaffFormModal
          open={editing !== null}
          staff={editing === 'new' || editing === null ? undefined : editing}
          title={form.title}
          branchOptions={form.branchOptions}
          branchHint={form.branchHint}
          create={form.create}
          update={form.update}
          onClose={() => setEditing(null)}
          onCreated={setCredentials}
        />
        <TemporaryPasswordDialog
          credentials={credentials}
          title="Xodim qo‘shildi — kirish paroli"
        note="Uni xodimga shaxsan yetkazing. ⚠ Xodim keyin parolni o‘zi almashtira olmaydi — kerak bo‘lsa yana shu yerdan yangisini berasiz."
        confirmLabel="Parolni saqladim / xodimga yetkazdim"
          onClose={() => setCredentials(null)}
        />
        {passwordFlow.element}

        {toggling && (
          <ConfirmDialog
            open
            onClose={() => {
              setToggling(null);
              update.reset();
              deactivate?.reset();
            }}
            danger={toggling.isActive}
            title={toggling.isActive ? `${toggling.fullName} — faolsizlantirish?` : `${toggling.fullName} — qayta faollashtirish?`}
            description={toggling.isActive ? deactivateText : 'Xodim yana tizimga kira oladi.'}
            confirmText={toggling.isActive ? 'Faolsizlantirish' : 'Faollashtirish'}
            pending={update.isPending || Boolean(deactivate?.isPending)}
            error={update.error ? errorMessage(update.error) : deactivate?.error ? errorMessage(deactivate.error) : undefined}
            onConfirm={() => {
              const onSuccess = () => {
                toast.success(toggling.isActive ? 'Xodim faolsizlantirildi' : 'Xodim faollashtirildi');
                setToggling(null);
              };
              if (toggling.isActive && deactivate) deactivate.mutate(toggling.id, { onSuccess });
              else update.mutate({ id: toggling.id, body: { isActive: !toggling.isActive } }, { onSuccess });
            }}
          />
        )}
      </div>
    </RowActionsContext>
  );
}

function RowActions({ staff }: { staff: Staff }) {
  const actions = use(RowActionsContext);
  if (!actions) return null;
  return (
    <div className="flex justify-end gap-1">
      <IconButton label={`${staff.fullName} — tahrirlash`} onClick={() => actions.edit(staff)}>
        <Pencil size={15} aria-hidden />
      </IconButton>
      <IconButton
        label={`${staff.fullName} — yangi parol berish`}
        onClick={() => actions.resetPassword(staff)}
      >
        <KeyRound size={15} aria-hidden />
      </IconButton>
      <IconButton
        label={staff.isActive ? `${staff.fullName} — faolsizlantirish` : `${staff.fullName} — faollashtirish`}
        onClick={() => actions.toggle(staff)}
        danger={staff.isActive}
      >
        {staff.isActive ? <UserX size={15} aria-hidden /> : <UserCheck size={15} aria-hidden />}
      </IconButton>
    </div>
  );
}
