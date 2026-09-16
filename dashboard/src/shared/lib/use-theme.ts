import { useCallback, useState } from 'react';
import {
  applyTheme,
  persistTheme,
  readThemeEnvironment,
  resolveInitialTheme,
  type Theme,
} from './theme';

/** Joriy rejim va almashtirish — top paneldagi tugma uchun (D-003). */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveInitialTheme(readThemeEnvironment()),
  );

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
