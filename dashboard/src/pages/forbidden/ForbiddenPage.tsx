import { Link } from 'react-router';

/**
 * 403 — bo'lim bor, lekin xodim roli yetmaydi (D-007). Faqat MENYU
 * bo'limlari uchun: aniq resurs (begona filial narxi va h.k.) backenddan 404
 * keladi va "topilmadi" deb ko'rsatiladi — mavjudligi oshkor qilinmaydi.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
      <p className="text-xl font-semibold">403</p>
      <p className="text-muted">Bu bo‘lim sizning rolingiz uchun yopiq</p>
      <Link
        to="/"
        className="rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted"
      >
        Bosh sahifaga
      </Link>
    </div>
  );
}
