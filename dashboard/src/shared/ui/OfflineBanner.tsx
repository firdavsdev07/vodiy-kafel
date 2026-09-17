import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/lib/use-online-status';

/** Tarmoq yo'qolganda yuqorida banner (D-042). Ulanish qaytsa — o'zi yo'qoladi, TanStack Query so'rovlarni qayta yuboradi. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm text-warning">
      <WifiOff size={15} aria-hidden />
      Internet aloqasi yo‘q. Ulanish tiklangach ma’lumotlar o‘zi yangilanadi — saqlanmagan o‘zgarishlarni yopmang.
    </div>
  );
}
