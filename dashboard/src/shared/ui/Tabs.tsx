import { ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router';

export interface TabItem {
  to: string;
  label: string;
  /** `true` — boshqa bo'limga olib chiqadi (ikonka bilan ko'rsatiladi) */
  external?: boolean;
  /** Faqat aynan shu yo'lda aktiv (indeks tab) */
  end?: boolean;
}

/** Sahifa ichidagi tab'lar — har tab o'z URL'i (havolani ulashsa bo'ladi). */
export function Tabs({ items, label }: { items: readonly TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
      {items.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors ${
              isActive && !tab.external
                ? 'border-accent font-medium text-fg'
                : 'border-transparent text-muted hover:text-fg'
            }`
          }
        >
          {tab.label}
          {tab.external && <ExternalLink size={13} aria-hidden />}
        </NavLink>
      ))}
    </nav>
  );
}
