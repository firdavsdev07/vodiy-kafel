import { Link } from 'react-router';

/**
 * 404 — sahifa yo'q. ⚠ Backend "begona resurs" uchun ham 404 beradi va UI
 * buni "topilmadi" deb ko'rsatadi — "ruxsat yo'q" DEMAYDI (G, D-042).
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
      <p className="text-xl font-semibold">404</p>
      <p className="text-muted">Sahifa topilmadi</p>
      <Link
        to="/"
        className="rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted"
      >
        Bosh sahifaga
      </Link>
    </div>
  );
}
