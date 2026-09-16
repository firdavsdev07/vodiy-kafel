import {
  ArrowLeftRight,
  Building,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Package,
  Settings,
  Tags,
  Truck,
  UserCog,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

/**
 * Panel bo'limlari — YAGONA manba (D-003): yon menyu, sahifa sarlavhasi va
 * router shu ro'yxatdan quriladi. Yangi bo'lim = shu yerga bitta yozuv +
 * sahifa komponenti (`routes.tsx`).
 *
 * D-007 da har bo'limga `roles` qo'shiladi — menyu rolga qarab filtrlanadi.
 */
export type SectionId =
  | 'home'
  | 'orders'
  | 'supplyOrders'
  | 'customers'
  | 'products'
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
}

export interface NavGroup {
  title: string;
  sections: readonly NavSection[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: 'Asosiy',
    sections: [
      { id: 'home', path: '/', title: 'Bosh sahifa', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Savdo',
    sections: [
      { id: 'orders', path: '/orders', title: 'Buyurtmalar', icon: ClipboardList },
      {
        id: 'supplyOrders',
        path: '/supply-orders',
        title: 'Ta’minot buyurtmalari',
        icon: ArrowLeftRight,
      },
      { id: 'customers', path: '/customers', title: 'Optom mijozlar', icon: Users },
    ],
  },
  {
    title: 'Katalog',
    sections: [
      { id: 'products', path: '/products', title: 'Mahsulotlar', icon: Package },
      { id: 'prices', path: '/prices', title: 'Narxlar', icon: Tags },
      { id: 'stock', path: '/stock', title: 'Zaxira', icon: Warehouse },
    ],
  },
  {
    title: 'Tashkilot',
    sections: [
      { id: 'branches', path: '/branches', title: 'Filiallar', icon: Building },
      { id: 'partners', path: '/partners', title: 'Hamkorlar', icon: Handshake },
      { id: 'staff', path: '/staff', title: 'Xodimlar', icon: UserCog },
      { id: 'delivery', path: '/delivery', title: 'Yetkazib berish', icon: Truck },
      { id: 'settings', path: '/settings', title: 'Sozlamalar', icon: Settings },
    ],
  },
];

export const NAV_SECTIONS: readonly NavSection[] = NAV_GROUPS.flatMap(
  (group) => group.sections,
);

export const APP_NAME = 'Vodiy Kafel';

/** Brauzer yorlig'i: "Buyurtmalar — Vodiy Kafel". */
export function documentTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} — ${APP_NAME}` : `${APP_NAME} — boshqaruv paneli`;
}
