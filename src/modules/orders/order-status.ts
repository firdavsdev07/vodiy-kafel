import { OrderStatus } from '../../common/enums';

/**
 * Buyurtma holati o'tishlari (B-029, TZ 3.4) — YAGONA joy.
 *
 * ❓ OCHIQ SAVOL №1: status nomlari mijoz bilan tasdiqlanmagan. O'zgarsa —
 *    enum migratsiyasi va faqat shu fayl.
 *
 * Ikki xil yo'l:
 *   Yetkazib berish: NEW → SEARCHING_TRANSPORT → LOADING → DELIVERING → DELIVERED
 *   Olib ketish:     NEW → LOADING → DELIVERED
 *     (mashina qidirilmaydi va yo'lda bo'lmaydi — mijoz o'zi yuklab ketadi)
 *
 * Bekor qilish — yuk yo'lga chiqquncha (NEW, SEARCHING_TRANSPORT, LOADING).
 * DELIVERING dan keyin bekor qilinmaydi: mahsulot allaqachon omborda emas.
 * DELIVERED va CANCELLED — yakuniy, orqaga qaytish yo'q.
 */
const DELIVERY_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: [OrderStatus.SEARCHING_TRANSPORT, OrderStatus.CANCELLED],
  SEARCHING_TRANSPORT: [OrderStatus.LOADING, OrderStatus.CANCELLED],
  LOADING: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
  DELIVERING: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

const PICKUP_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: [OrderStatus.LOADING, OrderStatus.CANCELLED],
  SEARCHING_TRANSPORT: [],
  LOADING: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERING: [],
  DELIVERED: [],
  CANCELLED: [],
};

export const allowedNextStatuses = (
  current: OrderStatus,
  hasDelivery: boolean,
): readonly OrderStatus[] =>
  (hasDelivery ? DELIVERY_FLOW : PICKUP_FLOW)[current];

export const canTransition = (
  from: OrderStatus,
  to: OrderStatus,
  hasDelivery: boolean,
): boolean => allowedNextStatuses(from, hasDelivery).includes(to);
