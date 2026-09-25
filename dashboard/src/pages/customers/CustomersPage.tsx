import { KeyRound, Plus } from 'lucide-react';
import { createContext, use, useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import { useCustomers } from '@/features/customers/api';
import { CreateCustomerModal } from '@/features/customers/CreateCustomerModal';
import { useResetPasswordFlow } from '@/features/customers/ResetPasswordFlow';
import {
  branchCustomerConfig,
  superAdminCustomerConfig,
  type CustomerFilters,
  type CustomerListItem,
} from '@/features/customers/list';
import { formatUzPhone } from '@/shared/lib/format';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  BalanceText,
  Button,
  DataTable,
  DateText,
  FilterBar,
  FilterSelect,
  IconButton,
  Pagination,
  tableColumns,
  TemporaryPasswordDialog,
  type DataTableColumn,
} from '@/shared/ui';

const col = tableColumns<CustomerListItem>();

const companyColumn = col.accessor('companyName', {
  header: 'Kompaniya',
  size: 240,
  cell: ({ row }) => (
    <div className="min-w-0">
      <p className={`truncate font-medium ${row.original.isActive ? '' : 'text-muted'}`}>{row.original.companyName}</p>
      <p className="truncate font-mono text-xs text-muted">{row.original.login}</p>
    </div>
  ),
});
const contactColumns: DataTableColumn<CustomerListItem>[] = [
  col.accessor('contactName', { header: 'Mas’ul shaxs', size: 170 }),
  col.accessor('phone', {
    header: 'Telefon',
    size: 160,
    cell: (c) => (
      <a href={`tel:${c.getValue()}`} className="whitespace-nowrap tabular-nums hover:underline">
        {formatUzPhone(c.getValue())}
      </a>
    ),
  }),
];
const branchColumn = col.accessor((c) => c.branch.name, { id: 'branch', header: 'Filial', size: 130 });
const tailColumns: DataTableColumn<CustomerListItem>[] = [
  col.accessor('balance', {
    header: 'Balans',
    size: 150,
    meta: { align: 'right' },
    cell: (c) => <BalanceText value={c.getValue()} />,
  }),
  col.accessor('isActive', {
    header: 'Holat',
    size: 170,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.isActive ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">Bloklangan</Badge>}
        {row.original.mustChangePassword && <Badge tone="warning">Parol almashtirilmagan</Badge>}
      </div>
    ),
  }),
  col.accessor('createdAt', { header: 'Qo‘shilgan', size: 110, cell: (c) => <DateText value={c.getValue()} format="date" /> }),
];

const ResetContext = createContext<(c: CustomerListItem) => void>(() => {});
const actionsColumn = col.display({
  id: 'actions',
  size: 56,
  header: () => <span className="sr-only">Amallar</span>,
  meta: { align: 'right' },
  cell: ({ row }) => <ResetPasswordButton customer={row.original} />,
});

// Parol tiklash — barcha xodim (backend @Roles: ALL_STAFF)
const superAdminColumns: DataTableColumn<CustomerListItem>[] = [companyColumn, ...contactColumns, branchColumn, ...tailColumns, actionsColumn];
const branchColumns: DataTableColumn<CustomerListItem>[] = [companyColumn, ...contactColumns, ...tailColumns, actionsColumn];

const activeOptions = [
  { value: 'true', label: 'Faol' },
  { value: 'false', label: 'Bloklangan' },
] as const;
const debtOptions = [
  { value: 'true', label: 'Qarzdorlar' },
  { value: 'false', label: 'Qarzi yo‘q' },
] as const;

/**
 * Optom mijozlar (D-020). 🔒 Filial admini/menejeri faqat o'z filialini
 * ko'radi — BACKENDDA; frontendda qo'shimcha filtr QO'YILMAYDI. Filial
 * tanlagichi va ustuni — SUPER_ADMIN va MODERATOR (`customers.allBranches`).
 */
export default function CustomersPage() {
  const allBranches = useCan('customers.allBranches');
  const list = useListParams<CustomerFilters>(allBranches ? superAdminCustomerConfig : branchCustomerConfig);
  const customers = useCustomers(list.params);
  const branches = useBranches(allBranches);
  const { filters } = list.params;
  const page = customers.data;
  const [creating, setCreating] = useState(false);
  // 🔒 Yangi mijozning vaqtinchalik paroli FAQAT shu holatda — oyna yopilganda o'chadi
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);
  const reset = useResetPasswordFlow();

  return (
    <ResetContext value={reset.request}>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <FilterBar
            search={filters.search}
            onSearchChange={(v) => list.setFilter('search', v)}
            searchPlaceholder="Login, kompaniya, telefon yoki INN…"
            hasFilters={list.hasFilters}
            onReset={list.resetFilters}
            actions={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden />
                Yangi mijoz
              </Button>
            }
          >
            {allBranches && (
              <FilterSelect
                label="Filial"
                value={filters.branchId}
                onChange={(v) => list.setFilter('branchId', v)}
                loading={branches.isPending}
                allLabel="Barcha filiallar"
                options={(branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <FilterSelect label="Holat" value={filters.isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
            <FilterSelect label="Balans" value={filters.hasDebt} onChange={(v) => list.setFilter('hasDebt', v)} options={debtOptions} />
          </FilterBar>
        </div>

        <DataTable
          caption="Optom mijozlar"
          columns={allBranches ? superAdminColumns : branchColumns}
          data={page?.items}
          getRowId={(c) => c.id}
          isLoading={customers.isPending}
          isFetching={customers.isPlaceholderData}
          error={customers.error}
          onRetry={() => void customers.refetch()}
          rowHref={(c) => `/customers/${c.id}`}
          emptyText={list.hasFilters ? 'Filtrga mos mijoz topilmadi' : 'Hozircha optom mijoz yo‘q'}
          footer={
            page && (
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                total={page.total}
                limit={list.params.limit}
                onPageChange={list.setPage}
                onLimitChange={list.setLimit}
                disabled={customers.isPlaceholderData}
              />
            )
          }
        />

        <CreateCustomerModal
          open={creating}
          allBranches={allBranches}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setCredentials(c);
          }}
        />
        {reset.element}
        <TemporaryPasswordDialog
          credentials={credentials}
          title="Hisob ochildi — vaqtinchalik parol"
          onClose={() => setCredentials(null)}
        />
      </div>
    </ResetContext>
  );
}

function ResetPasswordButton({ customer }: { customer: CustomerListItem }) {
  const open = use(ResetContext);
  return (
    <IconButton label={`${customer.companyName} — parolni tiklash`} onClick={() => open(customer)}>
      <KeyRound size={15} aria-hidden />
    </IconButton>
  );
}
