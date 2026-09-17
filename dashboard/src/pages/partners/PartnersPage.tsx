import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import {
  useDeletePartner,
  usePartners,
  useReorderPartners,
  useUpdatePartner,
  type PartnerFilters,
} from '@/features/partners/api';
import { reorderPatches, type Partner } from '@/features/partners/partner-form';
import { PartnerFormModal } from '@/features/partners/PartnerFormModal';
import { errorMessage } from '@/shared/lib/error-message';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import { Badge, Button, ConfirmDialog, ErrorState, FilterBar, FilterSelect, IconButton, PageLoading, Thumb, toast } from '@/shared/ui';

const config: ListParamsConfig<PartnerFilters> = { filterKeys: ['isActive'] };
const activeOptions = [
  { value: 'true', label: 'Ko‘rinadi' },
  { value: 'false', label: 'Yashirilgan' },
] as const;

type Dialog = { type: 'create' } | { type: 'edit'; partner: Partner } | { type: 'delete'; partner: Partner } | null;

/**
 * Hamkorlar (D-034) — saytdagi "hamkorlarimiz" logotiplari. Ro'yxat, qo'shish,
 * tahrirlash, logotip, tartib, yashirish, o'chirish. 🔒 Yozish — faqat
 * SUPER_ADMIN; boshqalar ko'radi.
 */
export default function PartnersPage() {
  const canWrite = useCan('partners.write');
  const list = useListParams<PartnerFilters>(config);
  const partners = usePartners(list.params.filters);
  const update = useUpdatePartner();
  const reorder = useReorderPartners();
  const remove = useDeletePartner();
  const [dialog, setDialog] = useState<Dialog>(null);

  const items = partners.data ?? [];
  // Tartib faqat TO'LIQ ro'yxatda suriladi — filtrda yashirilganlar bilan raqam to'qnashardi
  const canReorder = canWrite && !list.hasFilters && !reorder.isPending;
  const nextSortOrder = items.reduce((max, p) => Math.max(max, p.sortOrder + 1), 0);
  const deleting = dialog?.type === 'delete' ? dialog.partner : undefined;

  const move = (index: number, direction: -1 | 1) => {
    const patches = reorderPatches(items, index, direction);
    if (patches.length === 0) return;
    reorder.mutate(patches, { onError: toast.error });
  };

  const toggle = (p: Partner) =>
    update.mutate(
      { id: p.id, body: { isActive: !p.isActive } },
      { onSuccess: () => toast.success(p.isActive ? `${p.name} saytda yashirildi` : `${p.name} yana ko‘rinadi`), onError: toast.error },
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            canWrite && (
              <Button variant="primary" onClick={() => setDialog({ type: 'create' })}>
                <Plus size={16} aria-hidden />
                Yangi hamkor
              </Button>
            )
          }
        >
          <FilterSelect label="Holat" value={list.params.filters.isActive} onChange={(v) => list.setFilter('isActive', v)} options={activeOptions} />
        </FilterBar>

        {partners.isPending ? (
          <PageLoading />
        ) : partners.error ? (
          <ErrorState error={partners.error} onRetry={() => void partners.refetch()} retrying={partners.isFetching} />
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{list.hasFilters ? 'Filtrga mos hamkor yo‘q' : 'Hozircha hamkor qo‘shilmagan'}</p>
        ) : (
          <ol aria-busy={reorder.isPending || undefined} className={`divide-y divide-line ${reorder.isPending ? 'opacity-60' : ''}`}>
            {items.map((p, index) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-6 text-right text-xs text-muted tabular-nums" title="Tartib">{p.sortOrder}</span>
                <Thumb src={p.logoUrl} name={p.name} alt="" />
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-2 truncate font-medium ${p.isActive ? '' : 'text-muted'}`}>
                    {p.name}
                    {!p.isActive && <Badge tone="neutral">Yashirilgan</Badge>}
                  </p>
                  {p.websiteUrl ? (
                    <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted hover:text-fg hover:underline">
                      {p.websiteUrl}
                      <ExternalLink size={11} aria-hidden />
                    </a>
                  ) : (
                    <p className="text-xs text-muted">Sayt ko‘rsatilmagan</p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    {!list.hasFilters && (
                      <>
                        <IconButton label={`${p.name} — yuqoriga`} onClick={() => move(index, -1)} disabled={!canReorder || index === 0}>
                          <ArrowUp size={15} aria-hidden />
                        </IconButton>
                        <IconButton label={`${p.name} — pastga`} onClick={() => move(index, 1)} disabled={!canReorder || index === items.length - 1}>
                          <ArrowDown size={15} aria-hidden />
                        </IconButton>
                      </>
                    )}
                    <IconButton label={p.isActive ? `${p.name} — yashirish` : `${p.name} — ko‘rsatish`} onClick={() => toggle(p)} disabled={update.isPending}>
                      {p.isActive ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                    </IconButton>
                    <IconButton label={`${p.name} — tahrirlash`} onClick={() => setDialog({ type: 'edit', partner: p })}>
                      <Pencil size={15} aria-hidden />
                    </IconButton>
                    <IconButton label={`${p.name} — o‘chirish`} onClick={() => setDialog({ type: 'delete', partner: p })} danger>
                      <Trash2 size={15} aria-hidden />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {canWrite && list.hasFilters && items.length > 1 && (
          <p className="border-t border-line px-4 py-2 text-xs text-muted">Tartibni o‘zgartirish uchun filtrni tozalang.</p>
        )}
      </div>

      {canWrite && (
        <>
          <PartnerFormModal
            open={dialog?.type === 'create' || dialog?.type === 'edit'}
            partner={dialog?.type === 'edit' ? dialog.partner : undefined}
            nextSortOrder={nextSortOrder}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            onClose={() => {
              setDialog(null);
              remove.reset();
            }}
            danger
            title={deleting ? `“${deleting.name}” ni butunlay o‘chirish?` : ''}
            description="Yozuv va logotip serverdan o‘chiriladi. Vaqtincha olib tashlash uchun “Yashirish” dan foydalaning."
            confirmText="O‘chirish"
            pending={remove.isPending}
            error={remove.error ? errorMessage(remove.error) : undefined}
            onConfirm={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast.success('Hamkor o‘chirildi');
                  setDialog(null);
                },
              })
            }
          />
        </>
      )}
    </div>
  );
}
