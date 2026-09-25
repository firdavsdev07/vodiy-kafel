import { NotificationsView } from '@/features/cabinet/NotificationsView';

/**
 * Kabinet bildirishnomalari (D-058). O'qilmaganlar soni va yangilari fonda
 * `GET /me/updates` orqali yangilanadi (`useCabinetUpdates`, kabinet layoutida).
 */
export default function CabinetNotificationsPage() {
  return <NotificationsView orderHref={(id) => `/kabinet/buyurtmalar/${id}`} />;
}
