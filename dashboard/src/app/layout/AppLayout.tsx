import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { usePersistentFlag } from '@/shared/lib/use-persistent-flag';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Sidebar } from './Sidebar';
import { usePageTitle } from './page-title';
import { Topbar } from './Topbar';

/** Umumiy layout: yon menyu + yuqori panel + kontent (D-003). Sessiya — `RequireAuth` (D-007). */
export function AppLayout() {
  const [collapsed, toggleCollapsed] = usePersistentFlag('vk-dashboard-sidebar-collapsed', false);
  const title = usePageTitle();

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
