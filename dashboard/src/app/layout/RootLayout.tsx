import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { documentTitle } from '@/app/navigation';
import { usePageTitle } from './page-title';

/** Barcha marshrutlar ildizi: brauzer sarlavhasi (login ham, panel ham). */
export function RootLayout() {
  const title = usePageTitle();
  useEffect(() => {
    document.title = documentTitle(title);
  }, [title]);
  return <Outlet />;
}
