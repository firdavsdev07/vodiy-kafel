import { NotificationsView } from '@/features/cabinet/NotificationsView';

/**
 * Xodim bildirishnomalari (T-011). 🔒 Kim nimani ko'rishi — backendda:
 * SUPER_ADMIN va MODERATOR — hammasi, MANAGER — faqat o'ziga biriktirilgan
 * mijozlar (yoki buyurtmalar), filial admini — o'z filiali.
 */
export default function NotificationsPage() {
  return <NotificationsView orderHref={(id) => `/orders/${id}`} />;
}
