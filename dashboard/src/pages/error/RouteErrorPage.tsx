import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router';
import { classifyRouteError } from '@/shared/lib/route-error';
import NotFoundPage from '@/pages/not-found/NotFoundPage';

/**
 * Global xato sahifasi (D-042) — sahifa kodi yiqilsa oq ekran o'rniga.
 * Marshrutlar `errorElement` i: panel ichida yon menyu saqlanadi.
 * ⚠ Stack va ichki matn foydalanuvchiga KO'RSATILMAYDI — faqat dev konsolida.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  const kind = classifyRouteError(error);

  useEffect(() => {
    if (import.meta.env.DEV) console.error(error);
  }, [error]);

  if (kind === 'not-found') return <NotFoundPage />;

  return (
    <div role="alert" className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle size={24} className="text-danger" aria-hidden />
      <p className="text-lg font-semibold">{kind === 'chunk' ? 'Panelning yangi versiyasi chiqdi' : 'Kutilmagan xato yuz berdi'}</p>
      <p className="max-w-md text-sm text-muted">
        {kind === 'chunk'
          ? 'Sahifani yangilang — kiritilgan ma’lumotlar serverda saqlangan bo‘lsa, yo‘qolmaydi.'
          : 'Sahifani yangilab ko‘ring. Takrorlansa — qaysi amaldan keyin chiqqanini administratorga yozing.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:opacity-90"
        >
          <RefreshCw size={15} aria-hidden />
          Sahifani yangilash
        </button>
        <Link to="/" className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-muted">
          Bosh sahifaga
        </Link>
      </div>
    </div>
  );
}
