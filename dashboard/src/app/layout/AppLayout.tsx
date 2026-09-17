import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { isTypingTarget } from '@/shared/lib/keyboard';
import { MEDIA, useMediaQuery } from '@/shared/lib/use-media-query';
import { usePersistentFlag } from '@/shared/lib/use-persistent-flag';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Sidebar } from './Sidebar';
import { usePageTitle } from './page-title';
import { Topbar } from './Topbar';

/**
 * Umumiy layout: yon menyu + yuqori panel + kontent (D-003). Sessiya — `RequireAuth` (D-007).
 *
 * Responsive (D-044):
 *   ≥1024px — menyu xodim tanlagandek (ochiq / yig'ilgan, saqlanadi)
 *   768–1023px — menyu doim yig'ilgan (faqat ikonkalar), jadval gorizontal scroll
 *   <768px — menyu yashirin, ☰ tugmasi bilan ustiga chiqadi (ko'rish ssenariylari)
 * Klaviatura: `/` — sahifadagi qidiruvga fokus; "Asosiy kontentga o'tish" havolasi.
 */
export function AppLayout() {
  const [collapsedPref, toggleCollapsed] = usePersistentFlag('vk-dashboard-sidebar-collapsed', false);
  const isTablet = useMediaQuery(MEDIA.md);
  const isDesktop = useMediaQuery(MEDIA.lg);
  const isPhone = !isTablet;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = usePageTitle();
  const { pathname } = useLocation();

  // Telefonda sahifa almashganda menyu yopiladi
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drawerOpen) setDrawerOpen(false);
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      const search = document.querySelector<HTMLInputElement>('input[data-page-search]');
      if (!search) return;
      event.preventDefault();
      search.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Asosiy kontentga o‘tish
      </a>

      {isPhone ? (
        drawerOpen && (
          <div className="fixed inset-0 z-40 flex">
            <button type="button" aria-label="Menyuni yopish" className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
            <div className="relative">
              <Sidebar collapsed={false} onToggle={() => setDrawerOpen(false)} toggleLabel="Menyuni yopish" />
            </div>
          </div>
        )
      ) : (
        <Sidebar
          collapsed={isDesktop ? collapsedPref : true}
          onToggle={isDesktop ? toggleCollapsed : undefined}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title ?? 'Sahifa topilmadi'} onOpenMenu={isPhone ? () => setDrawerOpen(true) : undefined} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
