import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';
import { APP_NAME, navGroupsForRole } from '@/app/navigation';
import { useProfile } from '@/features/auth/hooks';
import { useNewLeadsCount } from '@/features/leads/api';
import { can } from '@/shared/lib/permissions';

interface SidebarProps {
  collapsed: boolean;
  /** Yo'q bo'lsa — yig'ish tugmasi ko'rsatilmaydi (planshetda menyu doim yig'ilgan) */
  onToggle?: () => void;
  toggleLabel?: string;
}

/**
 * Yon menyu — NAV_GROUPS dan quriladi (D-003), xodim roliga ruxsat etilgan
 * bo'limlargina (D-007). Profil kelmaguncha skelet: yopiq bo'lim bir lahza
 * ham ko'rinib qolmasin. Yig'ilganda faqat ikonkalar.
 */
export function Sidebar({ collapsed, onToggle, toggleLabel }: SidebarProps) {
  const role = useProfile().data?.role;
  const groups = role ? navGroupsForRole(role) : [];
  // Saytdan kelgan, hali hech kim qaramagan murojaatlar (T-013)
  const newLeads = useNewLeadsCount(can(role, 'leads.manage')).data?.count ?? 0;
  const badges: Partial<Record<string, number>> = { leads: newLeads };

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
        {!role && <NavSkeleton />}
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-xs font-medium tracking-wide text-muted uppercase">
                {group.title}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.sections.map(({ id, path, title, icon: Icon }) => {
                const badge = badges[id] ?? 0;
                const label = badge > 0 ? `${title} — ${badge} ta yangi` : title;
                return (
                  <li key={id}>
                    <NavLink
                      to={path}
                      end={path === '/'}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-surface-muted font-medium text-fg'
                            : 'text-muted hover:bg-surface-muted hover:text-fg'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                    >
                      <span className="relative shrink-0">
                        <Icon size={17} aria-hidden />
                        {collapsed && badge > 0 && (
                          <span aria-hidden className="absolute -top-1 -right-1 size-2 rounded-full bg-danger" />
                        )}
                      </span>
                      {collapsed ? (
                        <span className="sr-only">{label}</span>
                      ) : (
                        <>
                          <span className="truncate">{title}</span>
                          {badge > 0 && (
                            <>
                              <span className="sr-only">, {badge} ta yangi</span>
                              <span
                                aria-hidden
                                className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums"
                              >
                                {badge > 99 ? '99+' : badge}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel ?? (collapsed ? 'Menyuni ochish' : 'Menyuni yig‘ish')}
          aria-expanded={!collapsed}
          className="flex h-11 items-center gap-3 border-t border-line px-5 text-sm text-muted hover:text-fg"
        >
          {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
          {!collapsed && <span>{toggleLabel ?? 'Yig‘ish'}</span>}
        </button>
      )}
    </aside>
  );
}

function NavSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1.5 px-0.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-surface-muted" />
      ))}
    </div>
  );
}
