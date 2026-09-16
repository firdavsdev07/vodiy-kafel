import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';
import { APP_NAME, NAV_GROUPS } from '@/app/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Yon menyu — NAV_GROUPS dan quriladi (D-003). Yig'ilganda faqat ikonkalar. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`sticky top-0 flex h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-line px-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-contrast">
          VK
        </span>
        {!collapsed && (
          <span className="truncate text-md font-semibold tracking-tight">{APP_NAME}</span>
        )}
      </div>

      <nav aria-label="Asosiy menyu" className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-xs font-medium tracking-wide text-muted uppercase">
                {group.title}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.sections.map(({ id, path, title, icon: Icon }) => (
                <li key={id}>
                  <NavLink
                    to={path}
                    end={path === '/'}
                    title={collapsed ? title : undefined}
                    className={({ isActive }) =>
                      `flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-surface-muted font-medium text-fg'
                          : 'text-muted hover:bg-surface-muted hover:text-fg'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    <Icon size={17} className="shrink-0" aria-hidden />
                    {collapsed ? <span className="sr-only">{title}</span> : <span className="truncate">{title}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish'}
        aria-expanded={!collapsed}
        className="flex h-11 items-center gap-3 border-t border-line px-5 text-sm text-muted hover:text-fg"
      >
        {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
        {!collapsed && <span>Yig‘ish</span>}
      </button>
    </aside>
  );
}
