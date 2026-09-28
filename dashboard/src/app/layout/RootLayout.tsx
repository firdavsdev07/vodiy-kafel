import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { documentTitle } from '@/app/navigation';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { TopProgress } from '@/shared/ui/TopProgress';
import { usePageTitle } from './page-title';

/** Barcha marshrutlar ildizi: brauzer sarlavhasi, tarmoq banneri va yuklanish chizig'i (login ham, panel ham). */
export function RootLayout() {
  const title = usePageTitle();
  useEffect(() => {
    document.title = documentTitle(title);
  }, [title]);
  return (
    <>
      <TopProgress />
      <OfflineBanner />
      <Outlet />
    </>
  );
}
