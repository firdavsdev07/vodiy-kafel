import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useHasSession } from '@/features/auth/hooks';
import { usePersistentFlag } from '@/shared/lib/use-persistent-flag';
import { Sidebar } from './Sidebar';
import { usePageTitle } from './page-title';
import { Topbar } from './Topbar';

/** Umumiy layout: yon menyu + yuqori panel + kontent (D-003). */
export function AppLayout() {
  const [collapsed, toggleCollapsed] = usePersistentFlag('vk-dashboard-sidebar-collapsed', false);
  const title = usePageTitle();
  const hasSession = useHasSession();
  const location = useLocation();

  // Sessiya yo'q / tugadi → kirish sahifasi, qaytish manzili saqlanadi.
  // ⚠ D-007 da <RequireAuth> + <RequireRole> ga ajratiladi.
  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title ?? 'Sahifa topilmadi'} />
        <main className="flex-1 p-6">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Yuklanmoqda…</span>
      <div className="h-8 w-56 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  );
}
