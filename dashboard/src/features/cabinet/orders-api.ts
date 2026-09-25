import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Page, type Schema } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type CustomerOrderListItem = Schema<'CustomerOrderListItemDto'>;
export type CustomerOrder = Schema<'OrderCustomerResponseDto'>;
export type CreateOrderBody = Schema<'CreateOrderDto'>;
export type PaymentMethod = CreateOrderBody['paymentMethod'];
export type OrderFilters = { status: string };

const ORDER_STATUSES = [
  'NEW',
  'SEARCHING_TRANSPORT',
  'LOADING',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

const isOrderStatus = (value: string | undefined): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

/** Mening buyurtmalarim — `GET /me/orders` (D-056). 🔒 Mijoz ID si tokendan. */
export function useMyOrders(params: ListParams<OrderFilters>) {
  const status = params.filters.status;
  const query = {
    page: params.page,
    limit: params.limit,
    ...(isOrderStatus(status) ? { status } : {}),
  };

  return useQuery({
    queryKey: queryKeys.cabinet.orders.list(query),
    queryFn: ({ signal }) =>
      api.get('/me/orders', { query, signal }) as Promise<Page<CustomerOrderListItem>>,
  });
}

/**
 * Buyurtma tafsiloti (D-056).
 *
 * 🔒 Boshqa mijozning buyurtmasi so'ralsa backend 404 beradi (403 emas —
 *    IDOR himoyasi, CLAUDE.md qoida 6). Frontend uni oddiy "topilmadi"
 *    deb ko'rsatadi.
 */
export function useMyOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.cabinet.orders.detail(id),
    queryFn: ({ signal }) => api.get('/me/orders/{id}', { params: { id }, signal }),
    enabled: id !== '',
  });
}

/**
 * Buyurtma berish — `POST /orders` (D-054).
 *
 * ⚠ Summa backendda QAYTA hisoblanadi, kalkulyator bilan AYNAN bir
 *   yo'ldan. Frontend ko'rsatgan summa bilan farq chiqsa — backendniki
 *   to'g'ri.
 */
export function useCreateOrder() {
  return useMutation({
    mutationFn: (body: CreateOrderBody) => api.post('/orders', { body }),
    meta: {
      invalidates: [
        queryKeys.cabinet.orders.all,
        // Buyurtma qarz yozuvini yaratadi — balans o'zgaradi
        queryKeys.cabinet.account,
        queryKeys.cabinet.transactions.all,
      ],
    },
  });
}

/** «Menejer bilan bog'lanish» — `GET /orders/{id}/manager-contact` (D-056, T-006). */
export function useManagerContact(orderId: string) {
  return useQuery({
    queryKey: queryKeys.cabinet.managerContact(orderId),
    queryFn: ({ signal }) =>
      api.get('/orders/{id}/manager-contact', { params: { id: orderId }, signal }),
    enabled: orderId !== '',
    staleTime: 5 * 60_000,
  });
}

/** «Menejer bilan aloqa» — mijozning o'z menejeri va filiali (T-006). */
export function useMyManagerContact() {
  return useQuery({
    queryKey: queryKeys.cabinet.myManagerContact(),
    queryFn: ({ signal }) => api.get('/me/manager-contact', { signal }),
    staleTime: 5 * 60_000,
  });
}
