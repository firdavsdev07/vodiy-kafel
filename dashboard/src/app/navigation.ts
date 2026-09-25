import {
  ArrowLeftRight,
  Building,
  Factory,
  ClipboardList,
  Handshake,
  Images,
  LayoutDashboard,
  Megaphone,
  Package,
  Ruler,
  Settings,
  Tags,
  Truck,
  UserCog,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { StaffRole } from '@/shared/auth';
import { PERMISSIONS, rolesForAny, STAFF_ROLES } from '@/shared/lib/permissions';

/**
 * Panel bo'limlari — YAGONA manba (D-003): yon menyu, sahifa sarlavhasi va
 * router shu ro'yxatdan quriladi. Yangi bo'lim = shu yerga bitta yozuv +
 * sahifa komponenti (`routes.tsx`).
 *
 * `roles` (D-007) — bo'limni kim ko'radi. Menyu ham, marshrut qo'riqchisi
 * (`RequireRole`) ham SHU maydondan o'qiydi; qiymatlar `permissions.ts` dan.
 */
export type SectionId =
  | 'home'
  | 'orders'
  | 'supplyOrders'
  | 'customers'
  | 'announcements'
  | 'products'
  | 'factories'
  | 'sizes'
  | 'gallery'
  | 'prices'
  | 'stock'
  | 'branches'
  | 'partners'
  | 'staff'
  | 'delivery'
  | 'settings';

export interface NavSection {
  id: SectionId;
  path: string;
  title: string;
  icon: LucideIcon;
  roles: readonly StaffRole[];
}

export interface NavGroup {
  title: string;
  sections: readonly NavSection[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: 'Asosiy',
    sections: [
      {
        id: 'home',
        path: '/',
        title: 'Bosh sahifa',
        icon: LayoutDashboard,
        roles: STAFF_ROLES,
      },
    ],
  },
  {
    title: 'Savdo',
    sections: [
      {
        id: 'orders',
        path: '/orders',
        title: 'Buyurtmalar',
        icon: ClipboardList,
        roles: PERMISSIONS['orders.manage'],
      },
      {
        id: 'supplyOrders',
        path: '/supply-orders',
        title: 'Ta’minot buyurtmalari',
        icon: ArrowLeftRight,
        // Markaz qabul qiladi (D-030), do'kon filiali yuboradi (D-032) — sahifa rolga qarab.
        roles: rolesForAny('supplyOrders.review', 'supplyOrders.create'),
      },
      {
        id: 'customers',
        path: '/customers',
        title: 'Optom mijozlar',
        icon: Users,
        roles: PERMISSIONS['customers.manage'],
      },
      {
        id: 'announcements',
        path: '/announcements',
        title: 'Xabarlar',
        icon: Megaphone,
        roles: PERMISSIONS['announcements.send'],
      },
    ],
  },
  {
    title: 'Katalog',
    sections: [
      {
        id: 'products',
        path: '/products',
        title: 'Mahsulotlar',
        icon: Package,
        roles: PERMISSIONS['catalog.view'],
      },
      {
        id: 'factories',
        path: '/factories',
        title: 'Zavodlar',
        icon: Factory,
        roles: PERMISSIONS['catalog.view'],
      },
      {
        id: 'sizes',
        path: '/sizes',
        title: 'O‘lchamlar',
        icon: Ruler,
        roles: PERMISSIONS['catalog.view'],
      },
      {
        id: 'gallery',
        path: '/gallery',
        title: 'Galereya',
        icon: Images,
        roles: PERMISSIONS['catalog.view'],
      },
      {
        id: 'prices',
        path: '/prices',
        title: 'Narxlar',
        icon: Tags,
        roles: PERMISSIONS['prices.view'],
      },
      {
        id: 'stock',
        path: '/stock',
        title: 'Zaxira',
        icon: Warehouse,
        roles: PERMISSIONS['stock.view'],
      },
    ],
  },
  {
    title: 'Tashkilot',
    sections: [
      {
        id: 'branches',
        path: '/branches',
        title: 'Filiallar',
        icon: Building,
        roles: PERMISSIONS['branches.view'],
      },
      {
        id: 'partners',
        path: '/partners',
        title: 'Hamkorlar',
        icon: Handshake,
        roles: PERMISSIONS['branches.view'],
      },
      {
        id: 'staff',
        path: '/staff',
        title: 'Xodimlar',
        icon: UserCog,
        // Menejerlar (SUPER_ADMIN, BRANCH_ADMIN) + moderatorlar (faqat SUPER_ADMIN)
        roles: rolesForAny('managers.manage', 'moderators.manage'),
      },
      {
        id: 'delivery',
        path: '/delivery',
        title: 'Yetkazib berish',
        icon: Truck,
        roles: PERMISSIONS['delivery.view'],
      },
      {
        id: 'settings',
        path: '/settings',
        title: 'Sozlamalar',
        icon: Settings,
        roles: PERMISSIONS['settings.view'],
      },
    ],
  },
];

export const NAV_SECTIONS: readonly NavSection[] = NAV_GROUPS.flatMap(
  (group) => group.sections,
);

/** Rolga ko'rinadigan menyu — bo'sh guruh ham tushib qoladi. */
export function navGroupsForRole(role: StaffRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => section.roles.includes(role)),
  })).filter((group) => group.sections.length > 0);
}

export const APP_NAME = 'Vodiy Kafel';

/** Brauzer yorlig'i: "Buyurtmalar — Vodiy Kafel". */
export function documentTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} — ${APP_NAME}` : `${APP_NAME} — boshqaruv paneli`;
}
