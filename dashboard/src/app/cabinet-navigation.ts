import {
  FileText,
  LayoutGrid,
  ShoppingCart,
  Wallet,
  Package,
  type LucideIcon,
} from 'lucide-react';

/**
 * Optom mijoz kabinetining menyusi (D-051) — YAGONA manba: sarlavha,
 * yon menyu, telefondagi pastki panel va marshrutlar shu ro'yxatdan.
 *
 * ⚠ Xodim menyusi (`navigation.ts`) bilan ARALASHMAYDI. Mijoz
 *   "Mahsulotlar", "Zaxira", "Filiallar" kabi xodim bo'limlarini umuman
 *   ko'rmaydi — ikki ro'yxat, ikki daraxt, ikki qo'riqchi
 *   (`RequireStaff` / `RequireCustomer`).
 *
 * ⚠ Bildirishnomalar bu ro'yxatda YO'Q: u sarlavhadagi qo'ng'iroq
 *   (D-058), pastki panelda beshinchi band bo'lib turmaydi.
 */
export type CabinetSectionId =
  | 'catalog'
  | 'cart'
  | 'orders'
  | 'account'
  | 'contracts';

export interface CabinetSection {
  id: CabinetSectionId;
  /** To'liq manzil — `/kabinet` bilan boshlanadi. */
  path: string;
  title: string;
  icon: LucideIcon;
  /** Telefondagi pastki panelda ko'rinadimi (joy 5 ta banddan oshmaydi). */
  onPhone: boolean;
}

export const CABINET_SECTIONS: readonly CabinetSection[] = [
  {
    id: 'catalog',
    path: '/kabinet',
    title: 'Katalog',
    icon: LayoutGrid,
    onPhone: true,
  },
  {
    id: 'cart',
    path: '/kabinet/savat',
    title: 'Savat',
    icon: ShoppingCart,
    onPhone: true,
  },
  {
    id: 'orders',
    path: '/kabinet/buyurtmalar',
    title: 'Buyurtmalarim',
    icon: Package,
    onPhone: true,
  },
  {
    id: 'account',
    path: '/kabinet/hisob',
    title: 'Hisobim',
    icon: Wallet,
    onPhone: true,
  },
  {
    id: 'contracts',
    path: '/kabinet/shartnomalar',
    title: 'Shartnomalar',
    icon: FileText,
    onPhone: true,
  },
];

/** Bildirishnomalar sahifasi — menyuda emas, qo'ng'iroq orqali (D-058). */
export const CABINET_NOTIFICATIONS_PATH = '/kabinet/bildirishnomalar';

export const CABINET_NAME = 'Optom kabinet';
