import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

/**
 * Saqlanmagan o'zgarish bilan chiqishda ogohlantirish (D-012):
 *   • ilova ichidagi o'tish (menyu, tab, orqaga) — `useBlocker`, dialog
 *     komponent tomonidan ko'rsatiladi (`<UnsavedChangesDialog blocker>`);
 *   • tabni yopish / yangilash — brauzerning o'z `beforeunload` oynasi.
 * Faqat pathname o'zgarsa bloklanadi — filtr/query o'zgarishi emas.
 */
export function useUnsavedChanges(dirty: boolean) {
  // Saqlangandan so'ng darhol navigate — `dirty` hali eski renderdan true bo'ladi;
  // `allowNavigation()` (hodisa ichida chaqiriladi) keyingi o'tishni o'tkazib yuboradi.
  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypass.current) {
      bypass.current = false;
      return false;
    }
    return dirty && currentLocation.pathname !== nextLocation.pathname;
  });
  const allowNavigation = useCallback(() => {
    bypass.current = true;
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return { blocker, allowNavigation };
}
