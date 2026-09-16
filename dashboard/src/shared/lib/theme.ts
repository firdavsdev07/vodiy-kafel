/**
 * Yorug' / qorong'i rejim (D-002).
 *
 * Tanlov `localStorage` da; birinchi ochilishda — OS sozlamasi. Rejim
 * <html data-theme> orqali qo'llanadi (styles.css `dark:` varianti shunga
 * qaraydi). Miltillash bo'lmasligi uchun index.html dagi kichik skript ham
 * AYNAN shu kalit va shu mantiqdan foydalanadi.
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'vk-dashboard-theme';

export interface ThemeEnvironment {
  stored: string | null;
  prefersDark: boolean;
}

export function resolveInitialTheme({ stored, prefersDark }: ThemeEnvironment): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function readThemeEnvironment(): ThemeEnvironment {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Maxfiy rejim / bloklangan storage — OS sozlamasiga qaytamiz.
  }
  return {
    stored,
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  };
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Saqlab bo'lmasa ham joriy sahifada rejim ishlaydi.
  }
}
