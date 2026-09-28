import { useEffect, useState } from 'react';

/**
 * `active` ni ko'rsatish uchun yumshatadi (T-017):
 *   • `delayMs` dan qisqa ish umuman ko'rinmaydi — tez so'rovda miltillash yo'q;
 *   • ko'ringan bo'lsa kamida `minVisibleMs` turadi — chaqnab o'chmaydi.
 */
export function useDelayedFlag(active: boolean, { delayMs = 150, minVisibleMs = 400 } = {}): boolean {
  const [visible, setVisible] = useState(false);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (active && !visible) {
      const timer = setTimeout(() => {
        setShownAt(Date.now());
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }
    if (!active && visible) {
      const rest = Math.max(0, minVisibleMs - (Date.now() - shownAt));
      const timer = setTimeout(() => setVisible(false), rest);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [active, visible, shownAt, delayMs, minVisibleMs]);

  return visible;
}
