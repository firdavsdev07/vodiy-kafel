import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api, type Schema } from '@/shared/api';
import { queryKeys } from '@/shared/query';

export type Announcement = Schema<'AnnouncementDto'>;
export type AnnouncementAudience = Announcement['audience'];

export interface AnnouncementDraft {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  customerIds: readonly string[];
  image: File | null;
}

/**
 * Forma → `multipart/form-data` (T-009). `customerIds` — JSON massiv
 * (backend JSON, vergulli yoki takrorlangan maydonni qabul qiladi).
 * Bo'sh sarlavha yuborilmaydi — backend standart sarlavha qo'yadi.
 */
export function toAnnouncementFormData(draft: AnnouncementDraft): FormData {
  const body = new FormData();
  if (draft.title.trim()) body.append('title', draft.title.trim());
  body.append('body', draft.body.trim());
  body.append('audience', draft.audience);
  if (draft.audience === 'SELECTED') body.append('customerIds', JSON.stringify(draft.customerIds));
  if (draft.image) body.append('image', draft.image);
  return body;
}

/** Xabar yuborish. 🔒 Kimga yetishi (doira) — backendda. */
export function useSendAnnouncement() {
  return useMutation({
    mutationFn: (draft: AnnouncementDraft) =>
      api.upload('/admin/announcements', { body: toAnnouncementFormData(draft) }) as Promise<Announcement>,
    meta: { invalidates: [queryKeys.announcements.all] },
  });
}

/** Yuborilganlar tarixi — admin/moderator: hammasi, qolganlar: o'ziniki. */
export function useAnnouncements(page: number, limit = 10) {
  const query = { page, limit };
  return useQuery({
    queryKey: queryKeys.announcements.list(query),
    queryFn: ({ signal }) => api.get('/admin/announcements', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Qabul qiluvchini tanlash uchun qidiruv. ⚠ Menejer faqat O'ZIGA
 * biriktirilgan mijozga yoza oladi — ro'yxat ham shunga toraytiriladi
 * (backend baribir tekshiradi; bu faqat begona mijoz ko'rinmasligi uchun).
 */
export function useRecipientSearch(search: string, managerId: string | null) {
  const query = { search, isActive: true, limit: 10, ...(managerId ? { managerId } : {}) };
  return useQuery({
    queryKey: queryKeys.customers.list({ announcement: true, ...query }),
    queryFn: ({ signal }) => api.get('/admin/customers', { query, signal }),
    enabled: search.trim().length >= 2,
    staleTime: 30_000,
  });
}
