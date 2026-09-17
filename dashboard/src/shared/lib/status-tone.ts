import type { Schema } from '@/shared/api/types';

/**
 * Holat → rang ohangi — YAGONA joy (D-002). Komponent rangni o'zi tanlamaydi:
 * `toneClasses[statusTone.order[status]]`.
 *
 * Kalitlar backend enum'lari — `schema.d.ts` dan olinadi (D-004): backendga yangi holat qo'shilsa, bu yerda yo'qligi
 * TYPE xatosi bo'lib chiqadi. O'zbekcha matn — D-043 lug'atida.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type OrderStatus = Schema<'AdminOrderListItemDto'>['status'];
export type OrderSource = Schema<'AdminOrderListItemDto'>['source'];
export type OrderingType = Schema<'AdminOrderListItemDto'>['orderingType'];
export type PaymentMethod = Schema<'AdminOrderPaymentDto'>['method'];
export type PaymentStatus = Schema<'OrderPaymentDto'>['status'];
export type StockStatus = Schema<'ProductStockSummaryDto'>['stockStatus'];
export type TransactionType = Schema<'AccountTransactionAdminDto'>['type'];

export const orderStatusTone = {
  NEW: 'info',
  SEARCHING_TRANSPORT: 'warning',
  LOADING: 'warning',
  DELIVERING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
} as const satisfies Record<OrderStatus, Tone>;

export const paymentStatusTone = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
} as const satisfies Record<PaymentStatus, Tone>;

/** Zaxira 🟢🟡🔴 (TZ 3.2). */
export const stockStatusTone = {
  IN_STOCK: 'success',
  LOW: 'warning',
  OUT_OF_STOCK: 'danger',
} as const satisfies Record<StockStatus, Tone>;

/**
 * Hisob harakati (D-023): qarz — ogohlantirish, to'lov — yaxshi, tuzatish —
 * neytral (ishorasi summadan ko'rinadi).
 */
export const transactionTypeTone = {
  DEBT: 'warning',
  PAYMENT: 'success',
  ADJUSTMENT: 'neutral',
} as const satisfies Record<TransactionType, Tone>;

/** Ohang → Tailwind klasslari (tokenlar styles.css da). */
export const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  success: { badge: 'bg-success-soft text-success', dot: 'bg-success' },
  warning: { badge: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  danger: { badge: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  info: { badge: 'bg-info-soft text-info', dot: 'bg-info' },
  neutral: { badge: 'bg-neutral-soft text-neutral', dot: 'bg-neutral' },
};
