import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type Schema } from '@/shared/api';
import { env } from '@/shared/config/env';
import { queryKeys } from '@/shared/query';
import type { PaymentMethod } from './orders-api';

export type StartedPayment = Schema<'StartPaymentResponseDto'>;
export type PaymentStatus = Schema<'PaymentStatusResponseDto'>['status'];

/** To'lov holati tugagan — polling to'xtaydi. */
const FINAL_STATUSES: readonly PaymentStatus[] = ['PAID', 'FAILED', 'CANCELLED'];

export const PAYMENT_POLL_MS = 3_000;

/**
 * To'lovni boshlash — `POST /orders/{id}/payment` (D-055).
 *
 * ⚠ Provayder nomi (Payme/Click) KODDA YOZILMAYDI — u backendning o'z
 *   taskida ulanadi (api B-050, CLAUDE.md qoida 3). UI faqat
 *   `PaymentMethod` enum'ini biladi, matni esa yagona lug'atdan
 *   (`paymentMethodLabel`).
 */
export function useStartPayment(orderId: string) {
  return useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post('/orders/{id}/payment', { params: { id: orderId }, body: { method } }),
    meta: { invalidates: [queryKeys.cabinet.orders.all] },
  });
}

/**
 * To'lov holatini kuzatish — `GET /payments/{id}/status` (D-055).
 *
 * Holat yakuniy bo'lgach polling TO'XTAYDI: bekorga so'rov ketmasin.
 */
export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: queryKeys.cabinet.payment(paymentId ?? ''),
    queryFn: ({ signal }) =>
      api.get('/payments/{id}/status', { params: { id: paymentId ?? '' }, signal }),
    enabled: Boolean(paymentId),
    refetchInterval: (query) =>
      query.state.data && FINAL_STATUSES.includes(query.state.data.status)
        ? false
        : PAYMENT_POLL_MS,
  });
}

export const isFinalPaymentStatus = (status: PaymentStatus): boolean =>
  FINAL_STATUSES.includes(status);

/**
 * 🧪 FAQAT DEV: mock to'lovni «to'landi»/«muvaffaqiyatsiz» qilib qo'yish
 * (`POST /dev/payments/{id}/simulate`).
 *
 * ⚠ Backendda bu endpoint `NODE_ENV=development` da ro'yxatdan o'tadi,
 *   productionda umuman yo'q. Shu sababli tugma ham faqat dev rejimida
 *   ko'rsatiladi (`env.dev`) — aks holda mijoz bosib 404 olardi.
 */
export function useSimulatePayment(paymentId: string | null) {
  return useMutation({
    mutationFn: (status: 'PAID' | 'FAILED') =>
      api.post('/dev/payments/{id}/simulate', {
        params: { id: paymentId ?? '' },
        body: { status },
      }),
    meta: { invalidates: [queryKeys.cabinet.orders.all] },
  });
}

export const paymentSimulationAvailable = env.dev;
