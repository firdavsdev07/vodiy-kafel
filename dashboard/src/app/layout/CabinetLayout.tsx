import { Bell, LogOut, ShoppingCart, Store } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  CABINET_NAME,
  CABINET_NOTIFICATIONS_PATH,
  CABINET_SECTIONS,
} from '@/app/cabinet-navigation';
import { useCustomerProfile, useLogout } from '@/features/auth/hooks';
import { useCart } from '@/features/cabinet/cart-store';
import { totalPallets } from '@/features/cabinet/cart';
import { useCabinetUpdates, useUnreadCount } from '@/features/cabinet/notifications-api';
import { PageLoading } from '@/shared/ui/PageLoading';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { usePageTitle } from './page-title';

/**
 * Optom mijoz kabinetining qobig'i (D-051).
 *
 * ⚠ Xodimning `AppLayout` i EMAS va `Sidebar` i EMAS: menyu bandlari
 *   aralashmaydi (mijoz "Zaxira", "Filiallar", "Narxlar" ni umuman
 *   ko'rmaydi). Umumiy bo'lgani — tokenlar, so'rov keshi, tema, matn
 *   lug'ati, toast; ya'ni AYNAN shu sabab kabinet dashboard ichida
 *   qurilgan (EPIC 10 qarori).
 *
 * Responsive (kabinet TELEFONDA ishlatiladi — mijoz ofisda emas):
 *   ≥768px — sarlavha ostida gorizontal menyu
 *   <768px — pastda qo'l yetadigan panel (bottom tab bar), sahifa
 *            kontenti panel balandligicha pastdan bo'shatiladi
 */
export function CabinetLayout() {
  const navigate = useNavigate();
  const profile = useCustomerProfile();
  const logout = useLogout();
  const unread = useUnreadCount();
  const cart = useCart();
  const title = usePageTitle();

  // Fondagi yangilanishlar — kabinet ochiq bo'lgan vaqtning hammasida (D-058)
  useCabinetUpdates(true);

  const pallets = totalPallets(cart);
  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Asosiy kontentga o‘tish
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-contrast">
              VK
            </span>
            <div className="min-w-0 leading-tight">
              {/* Kompaniya nomi — profildan (api B-065). Kelmaguncha bo'lim nomi turadi. */}
              <p className="truncate text-sm font-semibold">
                {profile.data?.companyName ?? CABINET_NAME}
              </p>
              {profile.data && (
                <p className="flex items-center gap-1 truncate text-xs text-muted">
                  <Store size={12} aria-hidden />
                  {/* Filial MUHIM: narx aynan shu filialga bog'liq (TZ 3.7.1) */}
                  <span className="truncate">{profile.data.branch.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NavLink
              to={CABINET_NOTIFICATIONS_PATH}
              aria-label={
                unreadCount > 0
                  ? `Bildirishnomalar — ${unreadCount} ta o‘qilmagan`
                  : 'Bildirishnomalar'
              }
              className={({ isActive }) =>
                `relative inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface hover:bg-surface-muted ${
                  isActive ? 'text-fg' : 'text-muted'
                }`
              }
            >
              <Bell size={16} aria-hidden />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
            <ThemeToggle />
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => navigate('/kabinet/kirish', { replace: true }),
                })
              }
              aria-label="Chiqish"
              title="Chiqish"
              className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-fg disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden />
            </button>
          </div>
        </div>

        {/* Planshet va katta — gorizontal menyu */}
        <nav aria-label="Kabinet menyusi" className="hidden border-t border-line md:block">
          <ul className="mx-auto flex w-full max-w-6xl gap-1 px-4 md:px-6">
            {CABINET_SECTIONS.map(({ id, path, title: label, icon: Icon }) => (
              <li key={id}>
                <NavLink to={path} end={path === '/kabinet'} className={desktopLinkClass}>
                  <Icon size={16} aria-hidden />
                  {label}
                  {id === 'cart' && pallets > 0 && <CartBadge pallets={pallets} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 pb-24 outline-none md:px-6 md:py-6 md:pb-6"
      >
        <h1 className="sr-only">{title ?? CABINET_NAME}</h1>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Telefon — pastdagi panel: barmoq yetadigan joyda */}
      <nav
        aria-label="Kabinet menyusi"
        className="fixed bottom-0 z-20 w-full border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="flex">
          {CABINET_SECTIONS.filter((section) => section.onPhone).map(
            ({ id, path, title: label, icon: Icon }) => (
              <li key={id} className="flex-1">
                <NavLink to={path} end={path === '/kabinet'} className={phoneLinkClass}>
                  <span className="relative">
                    <Icon size={20} aria-hidden />
                    {id === 'cart' && pallets > 0 && (
                      <span
                        aria-hidden
                        className="absolute -top-1 -right-2 size-2 rounded-full bg-accent"
                      />
                    )}
                  </span>
                  <span className="truncate text-[11px]">{label}</span>
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
    </div>
  );
}

function CartBadge({ pallets }: { pallets: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-accent/15 px-1.5 text-xs font-medium tabular-nums">
      <ShoppingCart size={11} aria-hidden />
      {pallets}
    </span>
  );
}

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm transition-colors ${
    isActive
      ? 'border-accent font-medium text-fg'
      : 'border-transparent text-muted hover:text-fg'
  }`;

const phoneLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-15 flex-col items-center justify-center gap-1 px-1 transition-colors ${
    isActive ? 'text-accent' : 'text-muted'
  }`;
