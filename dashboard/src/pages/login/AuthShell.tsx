import type { ReactNode } from 'react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

/**
 * Kirish sahifalarining umumiy qobig'i (D-049) — xodim (`/login`) va
 * optom mijoz (`/kabinet/kirish`) uchun bir xil: logotip, tema tugmasi,
 * markazdagi karta.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-contrast">
            VK
          </span>
          <span className="text-md font-semibold tracking-tight">Vodiy Kafel</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
