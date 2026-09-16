import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { toastStore } from './toast';
import { TOAST_DURATION, type ToastItem } from './toast-store';

const icons = { success: CheckCircle2, error: CircleAlert, info: Info };
const iconClass = { success: 'text-success', error: 'text-danger', info: 'text-info' };

/** Toast'lar joyi — AppProviders da bir marta (D-008). */
export function Toaster() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </div>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  useEffect(() => {
    const timer = setTimeout(() => toastStore.dismiss(item.id), TOAST_DURATION[item.tone]);
    return () => clearTimeout(timer);
  }, [item.id, item.tone]);

  const Icon = icons[item.tone];
  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-md"
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass[item.tone]}`} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="whitespace-pre-line">{item.message}</p>
        {item.requestId && (
          <p className="mt-1 text-xs text-muted">
            ID: <code className="font-mono select-all">{item.requestId}</code>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => toastStore.dismiss(item.id)}
        aria-label="Yopish"
        className="shrink-0 rounded-sm text-muted hover:text-fg"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
