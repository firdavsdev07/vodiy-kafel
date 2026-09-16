import { useCallback, useState } from 'react';

/** localStorage da saqlanadigan boolean (masalan yig'ilgan menyu). Storage yo'q — xotirada. */
export function usePersistentFlag(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // saqlanmasa ham joriy sahifada ishlaydi
      }
      return next;
    });
  }, [key]);

  return [value, toggle];
}
