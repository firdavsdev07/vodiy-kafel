import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, type Page, type Schema } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type Notification = Schema<'NotificationDto'>;
export type NotificationFilters = { isRead: string };

/**
 * Bildirishnomalar (D-058, T-011) — mijoz ham, xodim ham: `/me/notifications`
 * egani tokendan oladi. (Avvalgi "xodimda endpoint yo'q" izohi eskirgan edi —
 * controller `CustomerOnlyGuard` siz.)
 */
export function useNotifications(params: ListParams<NotificationFilters>) {
  // `isRead` URL'da satr, API'da mantiqiy qiymat — boshqa qiymat filtrsiz
  const isRead =
    params.filters.isRead === 'true'
      ? true
      : params.filters.isRead === 'false'
        ? false
        : undefined;
  const query = { page: params.page, limit: params.limit, ...(isRead !== undefined && { isRead }) };

  return useQuery({
    queryKey: queryKeys.cabinet.notifications.list(query),
    queryFn: ({ signal }) =>
      api.get('/me/notifications', { query, signal }) as Promise<Page<Notification>>,
  });
}

/**
 * O'qilmaganlar soni — sarlavhadagi qo'ng'iroq uchun (D-051).
 * `pollMs` — admin panelda fon yangilanishi (`/me/updates` o'rniga; T-011).
 */
export function useUnreadCount(enabled = true, pollMs?: number) {
  return useQuery({
    queryKey: queryKeys.cabinet.unreadCount,
    queryFn: ({ signal }) => api.get('/me/notifications/unread-count', { signal }),
    enabled,
    staleTime: 30_000,
    ...(pollMs ? { refetchInterval: pollMs, refetchIntervalInBackground: false } : {}),
  });
}

const NOTIFICATION_KEYS = [
  queryKeys.cabinet.notifications.all,
  queryKeys.cabinet.unreadCount,
] as const;

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => api.patch('/me/notifications/{id}/read', { params: { id } }),
    meta: { invalidates: NOTIFICATION_KEYS },
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => api.patch('/me/notifications/read-all'),
    meta: { invalidates: NOTIFICATION_KEYS },
  });
}

/** So'rovlar orasidagi tanaffus — backend summary'sida «~15 soniya» deb yozilgan. */
export const UPDATES_POLL_MS = 15_000;

/**
 * Fondagi yangilanishlar (D-058): o'zgargan buyurtmalar, yangi
 * bildirishnomalar va o'qilmaganlar soni — BITTA so'rovda.
 *
 * ⚠ NEGA `useQuery` + `refetchInterval` EMAS: bu endpoint kursorli
 *   (`since` = oldingi javobdagi `serverTime`). `since` ni query key'ga
 *   qo'shish har javobda YANGI key yasardi (kesh cheksiz o'sardi), key'dan
 *   tashqarida saqlash esa TanStack uchun "o'zgarmagan so'rov" bo'lib
 *   ko'rinardi. Shuning uchun oddiy zanjirli `setTimeout`.
 *
 * ⚠ Sahifa fonda bo'lsa so'rov YUBORILMAYDI (`document.hidden`) —
 *   telefon batareyasi uchun. Ko'rinishga qaytganda darhol bir marta
 *   so'raladi.
 *
 * Javob keshni YANGILAMAYDI, faqat eskirgan deb belgilaydi: ro'yxat
 * sahifasi ochiq bo'lsa TanStack o'zi qayta so'raydi, yopiq bo'lsa
 * bekorga so'rov ketmaydi.
 */
export function useCabinetUpdates(enabled: boolean): void {
  const queryClient = useQueryClient();
  const since = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (!stopped) timer = setTimeout(() => void tick(), UPDATES_POLL_MS);
    };

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) return schedule();
      try {
        const updates = await api.get('/me/updates', {
          query: since.current ? { since: since.current } : {},
        });
        if (stopped) return;
        since.current = updates.serverTime;
        queryClient.setQueryData(queryKeys.cabinet.unreadCount, {
          count: updates.unreadCount,
        });
        if (updates.notifications.length > 0 || updates.truncated) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.cabinet.notifications.all,
          });
        }
        if (updates.orders.length > 0 || updates.truncated) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.cabinet.orders.all,
          });
        }
      } catch {
        // Fon so'rovi jim yiqiladi: mijozga toast ko'rsatilmaydi — u hech
        // narsa so'ramagan. Keyingi urinish o'z vaqtida bo'ladi.
      }
      schedule();
    };

    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, queryClient]);
}
