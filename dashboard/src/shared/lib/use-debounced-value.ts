import { useEffect, useState } from 'react';

/** Qiymat `delay` ms o'zgarmay tursa qaytadi — har harfga so'rov ketmasin. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
