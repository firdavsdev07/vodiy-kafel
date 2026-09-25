import type { Schema } from '@/shared/api';
import { normalizeDecimal } from '@/shared/lib/format';

export type OrderDetail = Schema<'AdminOrderDetailDto'>;
export type OrderItem = Schema<'OrderItemResponseDto'>;
export type OrderPayment = Schema<'AdminOrderPaymentDto'>;
export type OrderStatusEntry = Schema<'OrderStatusAdminEntryDto'>;

/**
 * Xaridor kim (D-025):
 *   customer — hisobi bor optom mijoz/agent (kartasiga havola bor)
 *   guest    — hisobsiz xaridor (`guestName`/`guestPhone`, qo'lda kiritilgan)
 *   branch   — filial ta'minot buyurtmasi (B-058), xaridor filialning o'zi
 */
export type BuyerKind =
  | { kind: 'customer'; customerId: string; name: string; contactName: string | null; phone: string | null }
  | { kind: 'guest'; name: string; phone: string | null }
  | { kind: 'branch'; name: string };

export function buyerOf(order: Pick<OrderDetail, 'buyer' | 'branch' | 'branchName'>): BuyerKind {
  const b = order.buyer;
  if (!b) return { kind: 'branch', name: order.branch?.name ?? order.branchName };
  if (b.customerId) {
    return { kind: 'customer', customerId: b.customerId, name: b.name, contactName: b.contactName ?? null, phone: b.phone ?? null };
  }
  return { kind: 'guest', name: b.name, phone: b.phone ?? null };
}

/** `"14.4000"` → `"14,4"` — m² va kg (pul emas, lekin baribir satr ustida, G6). */
export function formatQuantity(value: string): string {
  return normalizeDecimal(value).replace('.', ',');
}

/** Yo'l kira `0` — olib ketish yoki bepul; "0 so'm" o'rniga shu ko'rsatiladi. */
export function isZeroAmount(value: string): boolean {
  return /^-?0*(\.0*)?$/.test(value.trim());
}

/**
 * Xodim qo'lda tasdiqlay oladigan to'lov (D-029): kutilmoqda va karta EMAS.
 * Karta to'lovi faqat to'lov tizimi xabari bilan tasdiqlanadi (backend 400).
 */
export function isManuallyConfirmable(payment: Pick<OrderPayment, 'status' | 'method'>): boolean {
  return payment.status === 'PENDING' && payment.method !== 'CARD';
}

/** Yo'l kirani o'zgartirish mumkin bo'lgan holatlar — backend bilan bir xil (T-004). */
const DELIVERY_EDITABLE_STATUSES: readonly OrderDetail['status'][] = ['NEW', 'SEARCHING_TRANSPORT'];

/**
 * Yetkazib berishni belgilash formasi ko'rsatiladimi: yuk yuklanmagan va
 * to'lov qabul qilinmagan (aks holda backend 409 beradi).
 */
export function canEditDelivery(order: Pick<OrderDetail, 'status' | 'payments'>): boolean {
  return (
    DELIVERY_EDITABLE_STATUSES.includes(order.status) &&
    !order.payments.some((p) => p.status === 'PAID')
  );
}
