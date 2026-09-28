import { LoaderCircle } from 'lucide-react';

/**
 * Aylanuvchi yuklanish belgisi (T-017). Rangi — joriy matn rangi.
 * `label` berilsa ekran o'quvchiga ham aytiladi, aks holda bezak.
 */
export function Spinner({ size = 16, label, className = '' }: { size?: number; label?: string; className?: string }) {
  if (!label) return <LoaderCircle size={size} className={`animate-spin ${className}`} aria-hidden />;
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <LoaderCircle size={size} className="animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
