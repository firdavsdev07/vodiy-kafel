import type { OrderStatus } from '../../common/enums';

/**
 * Biznes hodisalari (B-037, CLAUDE.md qoida 10).
 *
 * Biznes-servis faqat SHU hodisani chiqaradi — kimga, qaysi kanal orqali,
 * qanday matn bilan xabar borishini bilmaydi. Hodisa DB tranzaksiyasi
 * TUGAGANDAN keyin chiqariladi: tinglovchi hali yozilmagan (yoki orqaga
 * qaytgan) ma'lumotni o'qib qolmasin.
 *
 * Payload — faqat ID lar. Tinglovchi kerakli ma'lumotni bazadan o'zi oladi:
 * hodisa navbatda kutib qolsa ham eskirgan nusxa bilan ishlamaydi.
 */
export const AppEvent = {
  OrderCreated: 'order.created',
  OrderStatusChanged: 'order.status.changed',
  PaymentPaid: 'payment.paid',
  ProductActivated: 'product.activated',
} as const;

export interface OrderCreatedEvent {
  orderId: string;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  note: string | null;
}

export interface PaymentPaidEvent {
  paymentId: string;
}

/**
 * Mahsulot faol holda yaratildi yoki faollashtirildi. "Yangimi" — tinglovchi
 * hal qiladi (`announcedAt`), chiqaruvchi buni bilmaydi.
 */
export interface ProductActivatedEvent {
  productId: string;
}
