import { useSyncExternalStore } from 'react';

/**
 * CSS media query holati (D-044). Tailwind breakpoint'lari bilan bir xil
 * qiymatlar ishlatilsin: `md` — 768px, `lg` — 1024px.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MEDIA = {
  /** Planshet va katta — yon menyu doim ko'rinadi */
  md: '(min-width: 768px)',
  /** Noutbuk/desktop — foydalanuvchi menyuni o'zi yig'adi/ochadi */
  lg: '(min-width: 1024px)',
} as const;
