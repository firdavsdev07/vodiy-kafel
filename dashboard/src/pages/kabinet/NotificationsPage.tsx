import { BellOff, CheckCheck } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
  type Notification,
  type NotificationFilters,
} from '@/features/cabinet/notifications-api';
import { notificationTypeLabel } from '@/shared/lib/labels';
import type { ListParamsConfig } from '@/shared/lib/list-params';
import { useListParams } from '@/shared/lib/use-list-params';
import {
  Badge,
  Button,
  DateText,
  ErrorState,
  FilterBar,
  FilterSelect,
  Pagination,
  toast,
} from '@/shared/ui';

const config: ListParamsConfig<NotificationFilters> = { filterKeys: ['isRead'] };

const readOptions = [
  { value: 'false', label: 'O‘qilmagan' },
  { value: 'true', label: 'O‘qilgan' },
] as const;

/**
 * Bildirishnomalar (D-058).
 *
 * ⚠ Bu endpointlar FAQAT mijoz uchun (`CustomerOnlyGuard`) — xodimda
 *   bildirishnoma umuman yo'q (ochiq savol ❓ 4), aralashtirilmaydi.
 *
 * O'qilmaganlar soni va yangi bildirishnomalar fonda `GET /me/updates`
 * orqali yangilanadi (`useCabinetUpdates`, kabinet layoutida).
 */
export default function CabinetNotificationsPage() {
  const list = useListParams<NotificationFilters>(config);
  const notifications = useNotifications(list.params);
  const unread = useUnreadCount();
  const markAll = useMarkAllNotificationsRead();

  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <FilterBar
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
          actions={
            <Button
              size="sm"
              disabled={unreadCount === 0}
              pending={markAll.isPending}
              onClick={() =>
                markAll.mutate(undefined, {
                  onSuccess: () => toast.success('Hammasi o‘qilgan deb belgilandi'),
                  onError: toast.error,
                })
              }
            >
              <CheckCheck size={15} aria-hidden />
              Hammasini o‘qilgan qilish
            </Button>
          }
        >
          <FilterSelect
            label="Holat"
            value={list.params.filters.isRead}
            onChange={(value) => list.setFilter('isRead', value)}
            allLabel="Hammasi"
            options={readOptions}
          />
        </FilterBar>

        {notifications.error ? (
          <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
        ) : notifications.isPending ? (
          <div aria-hidden className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ) : notifications.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <BellOff size={20} className="text-muted" aria-hidden />
            <p className="text-sm text-muted">
              {list.hasFilters ? 'Bu holatda bildirishnoma yo‘q' : 'Hozircha bildirishnoma yo‘q'}
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {notifications.data.items.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </ul>
            <Pagination
              page={notifications.data.page}
              limit={notifications.data.limit}
              total={notifications.data.total}
              totalPages={notifications.data.totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          </>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();

  return (
    <li
      className={`flex flex-wrap items-start gap-3 px-4 py-3 ${
        notification.isRead ? '' : 'bg-accent/5'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{notification.title}</p>
          <Badge tone="neutral">{notificationTypeLabel[notification.type]}</Badge>
          {!notification.isRead && <Badge tone="info">Yangi</Badge>}
        </div>
        <p className="text-sm whitespace-pre-line text-muted">{notification.body}</p>
        <DateText value={notification.createdAt} className="text-xs text-muted" />
      </div>

      {!notification.isRead && (
        <Button
          size="sm"
          variant="ghost"
          pending={markRead.isPending}
          onClick={() => markRead.mutate(notification.id, { onError: toast.error })}
        >
          O‘qildi
        </Button>
      )}
    </li>
  );
}
