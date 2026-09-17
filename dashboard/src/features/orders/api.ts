import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import { toOrdersQuery, type OrderFilters } from './list';
import type { CreateManualOrderBody } from './manual';
import type { ChangeStatusBody } from './status';

/** Buyurtma kelishini menejer sahifani yangilamasdan ko'rsin (task.txt ❓ 4 — vaqtinchalik qaror). */
const REFETCH_INTERVAL = 60_000;

/**
 * Buyurtmalar (D-024). 🔒 Filial xodimi faqat o'z filialini ko'radi — buni
 * BACKEND hal qiladi, bu yerda qo'shimcha filtr yo'q.
 */
export function useOrders(params: ListParams<OrderFilters>) {
  const query = toOrdersQuery(params);
  return useQuery({
    queryKey: queryKeys.orders.list(query),
    queryFn: ({ signal }) => api.get('/admin/orders', { query, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/**
 * Buyurtma kartasi (D-025). 🔒 Begona filial buyurtmasi — backend 404
 * ("Topilmadi"), 403 emas.
 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: ({ signal }) => api.get('/admin/orders/{id}', { params: { id }, signal }),
    enabled: id !== '',
  });
}

/**
 * Holat o'zgartirish (D-026). Optimistik EMAS — o'zgarish mijozga
 * bildirishnoma yuboradi, "orqaga qaytarish" yo'q; javob kelgunicha kutiladi.
 *
 * `customers.all` — bekor qilishda backend qarzni teskari ADJUSTMENT bilan
 * qaytaradi (mijoz balansi o'zgaradi).
 * 400/409 — holat eskirgan (boshqa xodim o'zgartirgan): karta qayta
 * yuklanadi, tugmalar yangi `allowedNextStatuses` dan quriladi.
 */
export function useChangeOrderStatus(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangeStatusBody) => api.patch('/admin/orders/{id}/status', { params: { id }, body }),
    meta: { invalidates: [queryKeys.orders.all, queryKeys.customers.all] },
    onError: (error) => {
      if (error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 409)) {
        void client.invalidateQueries({ queryKey: queryKeys.orders.all });
      }
    },
  });
}

/** Tezkor belgisi (D-027) — barcha xodim. Ro'yxat ham, karta ham yangilanadi. */
export function useSetOrderUrgent(id: string) {
  return useMutation({
    mutationFn: (isUrgent: boolean) => api.patch('/admin/orders/{id}/urgent', { params: { id }, body: { isUrgent } }),
    meta: { invalidates: [queryKeys.orders.all] },
  });
}

/**
 * Xodim biriktirish (D-027). `null` — olib tashlash. 🔒 SUPER_ADMIN,
 * BRANCH_ADMIN, MODERATOR; xodim buyurtma FILIALINING faol xodimi bo'lishi
 * shart — tekshiruv backendda (400).
 */
export function useAssignOrder(id: string) {
  return useMutation({
    mutationFn: (managerId: string | null) =>
      api.patch('/admin/orders/{id}/assign', { params: { id }, body: { managerId } }),
    meta: { invalidates: [queryKeys.orders.all] },
  });
}

/**
 * Naqd / o'tkazma to'lovini tasdiqlash (D-029). Tasdiqlangach to'lov holati,
 * mijoz balansi (PAYMENT yozuvi) va buyurtma kartasi birdan yangilanadi.
 * 🔒 SUPER_ADMIN, BRANCH_ADMIN, MODERATOR. Karta to'lovi bu yerdan
 * tasdiqlanmaydi (backend 400) — tugma ham chiqmaydi.
 */
export function useConfirmPayment() {
  return useMutation({
    mutationFn: ({ paymentId, note }: { paymentId: string; note?: string }) =>
      api.patch('/admin/payments/{id}/confirm', { params: { id: paymentId }, body: note ? { note } : {} }),
    meta: { invalidates: [queryKeys.orders.all, queryKeys.customers.all, queryKeys.payments.all] },
  });
}

/**
 * Qo'lda buyurtma (D-028). Takrorlanmaydi (`retry: false`) — ikki marta
 * bosish ikki buyurtma bo'lmasin. Mijoz buyurtmasi qarzga yoziladi —
 * `customers.all` ham eskiradi.
 */
export function useCreateManualOrder() {
  return useMutation({
    mutationFn: (body: CreateManualOrderBody) => api.post('/admin/orders', { body }),
    meta: { invalidates: [queryKeys.orders.all, queryKeys.customers.all] },
  });
}

/** Mijoz tanlash uchun qidiruv — faqat faol hisoblar, 10 ta. 🔒 Filial xodimi o'z mijozlarini oladi (backend). */
export function useCustomerSearch(search: string) {
  const query = { search, isActive: true, limit: 10 };
  return useQuery({
    queryKey: queryKeys.customers.list({ picker: true, ...query }),
    queryFn: ({ signal }) => api.get('/admin/customers', { query, signal }),
    enabled: search.length >= 2,
    staleTime: 30_000,
  });
}

/**
 * Menejer filtri uchun. `GET /admin/managers` — faqat SUPER_ADMIN va
 * BRANCH_ADMIN (`managers.manage`); boshqa rolda so'ralmaydi.
 * SUPER_ADMIN filial tanlagan bo'lsa — faqat o'sha filial menejerlari.
 */
/**
 * Ro'yxat FILTRI uchun menejerlar (`?managerId=`) — biriktirish emas.
 *
 * ⚠ `useAssignableStaff` bilan ARALASHTIRILMAYDI: bu yerda "kim bo'yicha
 *   filtrlash mumkin" degan savol va u buyurtmaga bog'liq emas, shuning
 *   uchun manba ham boshqa (`/admin/managers`). Ro'yxat MANAGER rolini
 *   qaytaradi va faqat `managers.manage` ruxsati borga ochiq.
 */
export function useManagerFilterOptions(enabled: boolean, branchId: string | undefined) {
  const query = { isActive: true, ...(branchId ? { branchId } : {}) };
  return useQuery({
    queryKey: queryKeys.managers.list(query),
    queryFn: ({ signal }) => api.get('/admin/managers', { query, signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Biriktirish uchun nomzod xodimlar (D-027, api B-062).
 *
 * ⚠ Filial so'rovda YUBORILMAYDI — backend uni BUYURTMADAN oladi (G5).
 *   Shu sababli begona filial buyurtmasi so'ralsa 404 keladi.
 * ⚠ `queryKey` buyurtma ostida: bitta filialning ro'yxati ikki
 *   buyurtmada bir xil bo'lsa ham, key'ni buyurtmaga bog'lash
 *   "qaysi filial" degan savolni frontendga qaytarmaydi.
 */
export function useAssignableStaff(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.orders.detail(orderId), 'assignable-staff'] as const,
    queryFn: ({ signal }) =>
      api.get('/admin/orders/{id}/assignable-staff', { params: { id: orderId }, signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}
