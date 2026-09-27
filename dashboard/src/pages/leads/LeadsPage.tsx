import { MessageSquareText, Phone } from 'lucide-react';
import { useId, useState } from 'react';
import { useProfile } from '@/features/auth/hooks';
import { useBranches } from '@/features/branches/api';
import {
  allBranchesLeadConfig,
  branchLeadConfig,
  LEAD_STATUSES,
  useLeads,
  useUpdateLead,
  type Lead,
  type LeadFilters,
  type LeadStatus,
} from '@/features/leads/api';
import { errorMessage } from '@/shared/lib/error-message';
import { formatUzPhone } from '@/shared/lib/format';
import { leadStatusLabel } from '@/shared/lib/labels';
import { can } from '@/shared/lib/permissions';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Button,
  controlClass,
  DateText,
  ErrorState,
  FilterBar,
  FilterSelect,
  Modal,
  PageLoading,
  Pagination,
  StatusBadge,
  toast,
} from '@/shared/ui';

const statusOptions = LEAD_STATUSES.map((v) => ({ value: v, label: leadStatusLabel[v] }));

/** Izoh uzunligi — backend `UpdateLeadDto.note` `@MaxLength(1000)`. */
const NOTE_MAX = 1000;

/**
 * Saytdagi aloqa formasidan kelgan murojaatlar (T-013). Mehmonning hisobi
 * yo'q — bu buyurtma emas, "qo'ng'iroq qiling" iltimosi: xodim qo'ng'iroq
 * qiladi va holatni belgilaydi. Filtrlar URL'da.
 *
 * 🔒 Doira backendda: filial xodimi faqat o'z do'koniga yozilganlarni
 *    ko'radi; do'kon tanlanmagan murojaat — SUPER_ADMIN va MODERATOR ga.
 */
export default function LeadsPage() {
  const profile = useProfile().data;
  const allBranches = can(profile?.role, 'customers.allBranches');
  const list = useListParams<LeadFilters>(allBranches ? allBranchesLeadConfig : branchLeadConfig);
  const { filters } = list.params;

  const leads = useLeads(list.params);
  const branches = useBranches(allBranches);
  const page = leads.data;
  const [noteFor, setNoteFor] = useState<Lead | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          search={filters.search}
          onSearchChange={(v) => list.setFilter('search', v)}
          searchPlaceholder="Ism, telefon yoki VK-…"
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
        >
          <FilterSelect label="Holat" value={filters.status} onChange={(v) => list.setFilter('status', v)} options={statusOptions} />
          {allBranches && (
            <FilterSelect
              label="Do‘kon"
              value={filters.branchId}
              onChange={(v) => list.setFilter('branchId', v)}
              loading={branches.isPending}
              allLabel="Barcha do‘konlar"
              options={(branches.data ?? []).filter((b) => b.type === 'RETAIL').map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
        </FilterBar>

        {leads.isPending ? (
          <PageLoading />
        ) : leads.error ? (
          <ErrorState error={leads.error} onRetry={() => void leads.refetch()} retrying={leads.isFetching} />
        ) : page?.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {list.hasFilters ? 'Filtrga mos murojaat topilmadi' : 'Hozircha saytdan murojaat kelmagan'}
          </p>
        ) : (
          <ul aria-busy={leads.isPlaceholderData || undefined} className={`divide-y divide-line ${leads.isPlaceholderData ? 'opacity-60' : ''}`}>
            {page?.items.map((lead) => (
              <LeadRow key={lead.id} lead={lead} showBranch={allBranches} onEditNote={() => setNoteFor(lead)} />
            ))}
          </ul>
        )}

        {page && page.total > 0 && (
          <div className="border-t border-line">
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              limit={list.params.limit}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
              disabled={leads.isPlaceholderData}
            />
          </div>
        )}
      </div>

      {noteFor && <NoteModal key={noteFor.id} lead={noteFor} onClose={() => setNoteFor(null)} />}
    </div>
  );
}

function LeadRow({ lead, showBranch, onEditNote }: { lead: Lead; showBranch: boolean; onEditNote: () => void }) {
  const update = useUpdateLead();
  const statusId = useId();

  const changeStatus = (status: LeadStatus) =>
    update.mutate(
      { id: lead.id, body: { status } },
      { onSuccess: () => toast.success(`${lead.reference} — ${leadStatusLabel[status].toLowerCase()}`), onError: toast.error },
    );

  return (
    <li className={`flex flex-col gap-3 px-4 py-4 ${lead.status === 'NEW' ? 'shadow-[inset_3px_0_0_var(--color-info)]' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{lead.name}</span>
            <StatusBadge kind="lead" value={lead.status} />
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-fg tabular-nums hover:underline">
              <Phone size={13} aria-hidden />
              {formatUzPhone(lead.phone)}
            </a>
            <span className="font-mono text-xs">{lead.reference}</span>
            {showBranch && <span>{lead.branch?.name ?? 'Do‘kon tanlanmagan'}</span>}
            <DateText value={lead.createdAt} />
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="sr-only">
            {lead.reference} — holat
          </label>
          <select
            id={statusId}
            value={lead.status}
            disabled={update.isPending}
            onChange={(e) => changeStatus(e.target.value as LeadStatus)}
            className={controlClass(false, 'h-8 w-auto px-2')}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={onEditNote} aria-label={`${lead.reference} — ${lead.note ? 'izohni tahrirlash' : 'izoh qo‘shish'}`}>
            <MessageSquareText size={14} aria-hidden />
            Izoh
          </Button>
        </div>
      </div>

      <p className="max-w-[75ch] text-sm leading-relaxed break-words whitespace-pre-wrap">{lead.message}</p>

      {(lead.note || lead.handledBy) && (
        <div className="flex flex-col gap-1 rounded-md bg-surface-muted px-3 py-2 text-sm">
          {lead.note && <p className="break-words whitespace-pre-wrap">{lead.note}</p>}
          {lead.handledBy && (
            <p className="text-xs text-muted">
              {lead.handledBy.fullName}
              {lead.handledAt && (
                <>
                  {' · '}
                  <DateText value={lead.handledAt} />
                </>
              )}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** Ichki izoh — mehmonga ko'rinmaydi. Bo'sh saqlansa — o'chiriladi. */
function NoteModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const update = useUpdateLead();
  const [note, setNote] = useState(lead.note ?? '');
  const id = useId();

  const save = () =>
    update.mutate(
      { id: lead.id, body: { note: note.trim() || null } },
      {
        onSuccess: () => {
          toast.success('Izoh saqlandi');
          onClose();
        },
      },
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Izoh — ${lead.name}`}
      description="Faqat xodimlarga ko‘rinadi."
      dismissible={!update.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={update.isPending}>
            Bekor qilish
          </Button>
          <Button variant="primary" onClick={save} pending={update.isPending}>
            Saqlash
          </Button>
        </>
      }
    >
      <label htmlFor={id} className="sr-only">
        Izoh
      </label>
      <textarea
        id={id}
        data-autofocus
        rows={4}
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Masalan: ertaga 10:00 da qayta qo‘ng‘iroq"
        className={controlClass(false, 'px-3 py-2')}
      />
      {update.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errorMessage(update.error)}
        </p>
      )}
    </Modal>
  );
}
