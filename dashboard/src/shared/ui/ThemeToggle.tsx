import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/lib/use-theme';

/** Yorug' / qorong'i rejim tugmasi — top panelda (D-003). */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-fg transition-colors hover:bg-surface-muted"
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
