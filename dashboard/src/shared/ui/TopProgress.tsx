import { useIsFetching, useIsMutating, type Query } from '@tanstack/react-query';
import { useDelayedFlag } from '@/shared/lib/use-delayed-flag';

/**
 * Faqat ma'lumoti hali YO'Q so'rov sanaladi: yangi sahifa, yangi filtr /
 * sahifalash kaliti. Fonda qayta yuklash (polling, oyna fokusi) chiziqni
 * yoqmaydi — aks holda u har 30 soniyada sababsiz yurib turardi.
 */
const isForegroundFetch = (query: Query): boolean => query.state.data === undefined;

/**
 * Ekran tepasidagi ingichka yuklanish chizig'i (T-017): ma'lumot kelayotganda
 * yoki saqlanayotganda. `aria-hidden` — tugma/sahifa o'z holatini o'zi aytadi.
 */
export function TopProgress() {
  const fetching = useIsFetching({ predicate: isForegroundFetch });
  const mutating = useIsMutating();
  const visible = useDelayedFlag(fetching + mutating > 0);

  return (
    <div
      aria-hidden
      data-testid="top-progress"
      data-visible={visible || undefined}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="top-progress-bar h-full w-2/5 bg-accent motion-reduce:w-full motion-reduce:opacity-60" />
    </div>
  );
}
