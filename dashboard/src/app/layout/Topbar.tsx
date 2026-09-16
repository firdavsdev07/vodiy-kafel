import { useQuery } from '@tanstack/react-query';
import { LogOut, Store } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLogout, useProfile } from '@/features/auth/hooks';
import { api } from '@/shared/api';
import { roleLabel } from '@/shared/lib/labels';
import { queryKeys } from '@/shared/query';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

/** Yuqori panel: sahifa sarlavhasi, filial, xodim, rejim, chiqish (D-003, D-006). */
export function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const logout = useLogout();
  const branchId = profile?.branchId ?? null;

  const branch = useQuery({
    queryKey: queryKeys.branches.detail(branchId ?? ''),
    queryFn: ({ signal }) => api.get('/admin/branches/{id}', { params: { id: branchId ?? '' }, signal }),
    enabled: branchId !== null,
    staleTime: 10 * 60_000,
  });

  const branchText = !profile
    ? null
    : branchId === null
      ? 'Barcha filiallar'
      : (branch.data?.name ?? '…');

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg/90 px-6 backdrop-blur">
      <h1 className="truncate text-md font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        {branchText && (
          <span className="hidden items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs text-muted sm:inline-flex">
            <Store size={14} aria-hidden />
            {branchText}
          </span>
        )}
        {profile && (
          <div className="hidden text-right leading-tight md:block">
            <p className="text-sm font-medium">{profile.fullName}</p>
            <p className="text-xs text-muted">{roleLabel[profile.role]}</p>
          </div>
        )}
        <ThemeToggle />
        <button
          type="button"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
          }
          aria-label="Chiqish"
          title="Chiqish"
          className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-fg disabled:opacity-60"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </header>
  );
}
