import { Info, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCan, useProfile } from '@/features/auth/hooks';
import { useCustomerOutlet } from '@/features/customers/use-customer-outlet';
import { AddRuleModal } from '@/features/pricing-rules/AddRuleModal';
import {
  useCustomerPricingRules,
  useDeletePricingRule,
  useDiscountLimit,
} from '@/features/pricing-rules/api';
import {
  CHAIN_ORDER,
  domainLabel,
  formatRuleValue,
  isDiscount,
  scopeLabel,
  type PricingRule,
} from '@/features/pricing-rules/pricing-rules';
import { errorMessage } from '@/shared/lib/error-message';
import {
  Badge,
  Button,
  ConfirmDialog,
  DateText,
  ErrorState,
  IconButton,
  PageLoading,
  toast,
} from '@/shared/ui';

/**
 * "Narx qoidalari" tab (D-019).
 *
 * 🔒 Bu tab faqat `pricingRules.manage` ruxsati borga ko'rinadi
 *    (`CustomerLayout` tab'ni o'zi yashiradi) — bu yerda ham qayta
 *    tekshiriladi, chunki URL orqali to'g'ridan-to'g'ri kirish mumkin.
 */
export default function CustomerPricingTab() {
  const c = useCustomerOutlet();
  const canManage = useCan('pricingRules.manage');
  const profile = useProfile();
  const isBranchAdmin = profile.data?.role === 'BRANCH_ADMIN';
  const { limit, isPending: limitPending } = useDiscountLimit(isBranchAdmin);

  const rules = useCustomerPricingRules(c.id);
  const remove = useDeletePricingRule(c.id);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PricingRule | null>(null);

  if (!canManage) {
    return <p className="py-8 text-center text-sm text-muted">Bu bo‘lim sizning rolingiz uchun yopiq.</p>;
  }
  if (rules.isPending || limitPending) return <PageLoading />;
  if (rules.error) {
    return <ErrorState error={rules.error} onRetry={() => void rules.refetch()} retrying={rules.isFetching} />;
  }

  const items = rules.data ?? [];
  // Chegara 0 — filial adminiga chegirma berish ruxsati sozlanmagan
  const blocked = limit?.maxDiscountPercent === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Individual narx qoidalari</h3>
          <p className="mt-0.5 text-xs text-muted">
            Bu mijoz uchun bazaviy filial narxidan chetlanish.
            {isBranchAdmin && ' Siz qo‘ygan qoidalar ko‘rinadi.'}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)} disabled={blocked}>
          <Plus size={15} aria-hidden />
          Qoida qo‘shish
        </Button>
      </div>

      {blocked && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
          Sizga chegirma berish ruxsati sozlanmagan — bosh administratorga murojaat qiling.
        </p>
      )}

      <ChainHint />

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Qoida yo‘q — mijoz o‘z filialining bazaviy narxini ko‘radi.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{domainLabel[rule.domain]}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">{scopeLabel[rule.scope]}</span>
                  {rule.target && <span className="font-medium">{rule.target.name}</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  <DateText value={rule.createdAt} />
                  {rule.createdBy && <> · {rule.createdBy.fullName}</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={isDiscount(rule) ? 'success' : 'neutral'}>{formatRuleValue(rule)}</Badge>
                <IconButton
                  label={`Qoidani o‘chirish — ${scopeLabel[rule.scope]}`}
                  onClick={() => setConfirmDelete(rule)}
                  danger
                >
                  <Trash2 size={15} aria-hidden />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddRuleModal
        open={adding}
        customerId={c.id}
        customerName={c.companyName}
        branchId={c.branch.id}
        limit={limit}
        onClose={() => setAdding(false)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => {
          setConfirmDelete(null);
          remove.reset();
        }}
        danger
        title="Qoidani o‘chirish?"
        description="Mijoz narxi darhol keyingi aniq qoidaga — yoki bazaviy filial narxiga qaytadi."
        confirmText="O‘chirish"
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : undefined}
        onConfirm={() => {
          if (!confirmDelete) return;
          remove.mutate(confirmDelete.id, {
            onSuccess: () => {
              toast.success('Qoida o‘chirildi');
              setConfirmDelete(null);
            },
          });
        }}
      />
    </div>
  );
}

/**
 * Zanjir tartibi — xodim "nega bu narx chiqdi" degan savolga javobni shu
 * yerdan topadi (api/CLAUDE.md qoida 11).
 */
function ChainHint() {
  return (
    <div className="flex gap-2 rounded-md bg-info-soft px-3 py-2 text-xs text-info">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Bir nechta qoida mos kelsa — eng aniqrog‘i ishlaydi:</p>
        <ol className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {CHAIN_ORDER.map((step, i) => (
            <li key={step.scope} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              <span>{step.text}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden>›</span>
            <span className="text-muted">Filial bazaviy narxi</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
