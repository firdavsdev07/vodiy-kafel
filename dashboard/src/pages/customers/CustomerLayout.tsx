import { ArrowLeft, KeyRound, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useCustomer, useSetCustomerActive } from '@/features/customers/api';
import { useResetPasswordFlow } from '@/features/customers/ResetPasswordFlow';
import { errorMessage } from '@/shared/lib/error-message';
import { formatUzPhone } from '@/shared/lib/format';
import { Badge, BalanceText, Button, ConfirmDialog, ErrorState, PageLoading, Tabs, toast, type TabItem } from '@/shared/ui';

/**
 * Mijoz kartasi (D-022): sarlavha (holat, balans), amallar (parol,
 * bloklash), tab'lar — Profil | Hisob (D-023) | Narx qoidalari (D-019) |
 * Buyurtmalar. 🔒 Begona filial mijozi — backend 404 → "Topilmadi".
 */
export default function CustomerLayout() {
  const { id = '' } = useParams();
  const customer = useCustomer(id);
  const canToggle = useCan('customers.toggleActive');
  const canPricing = useCan('pricingRules.manage');
  const setActive = useSetCustomerActive(id);
  const reset = useResetPasswordFlow();
  const [confirmActive, setConfirmActive] = useState(false);

  if (customer.isPending) return <PageLoading />;
  if (customer.error || !customer.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorState error={customer.error} onRetry={() => void customer.refetch()} retrying={customer.isFetching} />
      </div>
    );
  }

  const c = customer.data;
  const tabs: TabItem[] = [
    { to: `/customers/${c.id}`, label: 'Profil', end: true },
    { to: `/customers/${c.id}/account`, label: 'Hisob' },
    ...(canPricing ? [{ to: `/customers/${c.id}/pricing`, label: 'Narx qoidalari' }] : []),
    { to: `/customers/${c.id}/orders`, label: 'Buyurtmalar' },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <BackLink />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className={`truncate text-lg font-semibold ${c.isActive ? '' : 'text-muted'}`}>{c.companyName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono">{c.login}</span>·<span>{c.branch.name}</span>·
            <a href={`tel:${c.phone}`} className="tabular-nums hover:underline">{formatUzPhone(c.phone)}</a>
            {c.isActive ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">Bloklangan</Badge>}
          </p>
          {c.mustChangePassword && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-warning-soft px-2.5 py-1 text-xs text-warning">
              <KeyRound size={13} aria-hidden />
              Parol almashtirishi kerak — mijoz hali vaqtinchalik parol bilan birinchi marta kirmagan
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-muted">Balans</p>
            <BalanceText value={c.account.balance} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => reset.request(c)}>
              <KeyRound size={14} aria-hidden />
              Parolni tiklash
            </Button>
            {canToggle && (
              <Button size="sm" variant={c.isActive ? 'danger' : 'secondary'} onClick={() => setConfirmActive(true)}>
                {c.isActive ? <Lock size={14} aria-hidden /> : <Unlock size={14} aria-hidden />}
                {c.isActive ? 'Bloklash' : 'Faollashtirish'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <Tabs label="Mijoz bo‘limlari" items={tabs} />
      <div className="rounded-lg border border-line bg-surface p-6">
        <Outlet key={c.id} context={c} />
      </div>

      {reset.element}
      {canToggle && (
        <ConfirmDialog
          open={confirmActive}
          onClose={() => {
            setConfirmActive(false);
            setActive.reset();
          }}
          danger={c.isActive}
          title={c.isActive ? `“${c.companyName}” hisobini bloklash?` : `“${c.companyName}” hisobini faollashtirish?`}
          description={
            c.isActive
              ? 'Mijoz tizimga kira olmaydi va buyurtma bera olmaydi. Buyurtmalar, balans va tarix saqlanadi.'
              : 'Mijoz yana kira oladi va buyurtma bera oladi.'
          }
          confirmText={c.isActive ? 'Bloklash' : 'Faollashtirish'}
          pending={setActive.isPending}
          error={setActive.error ? errorMessage(setActive.error) : undefined}
          onConfirm={() =>
            setActive.mutate(!c.isActive, {
              onSuccess: () => {
                toast.success(c.isActive ? 'Hisob bloklandi' : 'Hisob faollashtirildi');
                setConfirmActive(false);
              },
            })
          }
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/customers" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeft size={15} aria-hidden />
      Optom mijozlar
    </Link>
  );
}
