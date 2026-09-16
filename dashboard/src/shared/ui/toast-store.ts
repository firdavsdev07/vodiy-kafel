export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  /** Xato uchun — foydalanuvchi qo'llab-quvvatlashga aytadi. */
  requestId?: string;
}

/** Xato xabari uzoqroq turadi — o'qib, requestId ni yozib olishga ulgurilsin. */
export const TOAST_DURATION: Record<ToastTone, number> = { success: 4000, info: 4000, error: 8000 };
export const MAX_TOASTS = 4;

/**
 * Toast navbati (D-008) — React'dan tashqari store: mutation `onError`,
 * query-client va komponent — hammasi bir xil `toast.error(...)` chaqiradi.
 */
export function createToastStore() {
  let items: readonly ToastItem[] = [];
  let seq = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function dismiss(id: number) {
    const next = items.filter((t) => t.id !== id);
    if (next.length !== items.length) {
      items = next;
      emit();
    }
  }

  function push(tone: ToastTone, message: string, requestId?: string): number {
    const id = ++seq;
    // Bir xil xabar ketma-ket 5 marta chiqmasin (masalan, bir nechta so'rov bir xil xato)
    const duplicate = items.find((t) => t.tone === tone && t.message === message);
    if (duplicate) dismiss(duplicate.id);
    items = [...items, { id, tone, message, requestId }].slice(-MAX_TOASTS);
    emit();
    return id;
  }

  return {
    push,
    dismiss,
    getSnapshot: () => items,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type ToastStore = ReturnType<typeof createToastStore>;
