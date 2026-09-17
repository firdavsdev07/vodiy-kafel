import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

/**
 * Brauzer tarmoqqa ulanganmi (D-042). ⚠ `navigator.onLine === true` internet
 * borligini KAFOLATLAMAYDI — faqat "aniq yo'q" holatini ishonchli aytadi,
 * shuning uchun faqat banner uchun ishlatiladi, so'rovlarni to'xtatish uchun emas.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
