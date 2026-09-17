import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { documentTitle } from '@/app/navigation';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { usePageTitle } from './page-title';

/** Barcha marshrutlar ildizi: brauzer sarlavhasi va tarmoq banneri (login ham, panel ham). */
export function RootLayout() {
  const title = usePageTitle();
  useEffect(() => {
    document.title = documentTitle(title);
  }, [title]);
  return (
    <>
      <OfflineBanner />
      <Outlet />
    </>
  );
}
