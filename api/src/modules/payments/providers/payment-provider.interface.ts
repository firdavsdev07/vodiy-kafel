import type { PaymentStatus } from '../../../common/enums';
import type { Money } from '../../../common/utils';

/**
 * Onlayn to'lov provayderi — interfeys ortida (CLAUDE.md qoida 3, B-032).
 *
 * ⚠ Butun loyihada FAQAT shu interfeys ishlatiladi. Biznes-servis
 *   provayder nomini bilmaydi: bugun `MockPaymentProvider` (B-033),
 *   keyin haqiqiysi (B-050) — faqat yangi klass va `payments.module`
 *   dagi tanlov o'zgaradi.
 *
 * Doira: faqat avtomatik to'lov (`PaymentMethod.CARD`). Naqd pul va
 * shartnoma bo'yicha o'tkazmani admin qo'lda tasdiqlaydi (B-034) —
 * ular provayderga umuman bormaydi.
 *
 * 🔒 Provayder BAZAGA YOZMAYDI va summani O'ZI HISOBLAMAYDI. Summa
 *    chaqiruvchidan keladi (buyurtmaning backendda hisoblangan
 *    `grandTotal`i, qoida 1); holatni saqlash, balans va bildirishnoma —
 *    `PaymentsService` ishi (B-034). Shunda provayder almashganda to'lov
 *    mantiqi ikki joyda yozilib qolmaydi.
 */
export interface PaymentProvider {
  /**
   * Provayderda to'lov yaratadi.
   *
   * `idempotencyKey` — `Payment.idempotencyKey`. Bir xil kalit bilan
   * qayta chaqirilsa, provayder YANGI to'lov ochmasligi, o'sha to'lovni
   * qaytarishi kerak (tarmoq uzilib, so'rov qayta yuborilgan holat).
   */
  createPayment(
    order: PaymentOrderRef,
    amount: Money,
    idempotencyKey: string,
  ): Promise<PaymentIntent>;

  /**
   * Provayderdagi joriy holat. Webhook kelmay qolganda (yoki kechiksa)
   * holatni so'rab olish uchun.
   */
  checkStatus(providerRef: string): Promise<PaymentStatus>;

  /**
   * 🔒 Webhook haqiqatan provayderdan kelganini tekshiradi (imzo, Basic
   *    auth va h.k.). `false` bo'lsa so'rov qayta ishlanmaydi va
   *    `handleWebhook` CHAQIRILMAYDI — aks holda istalgan odam
   *    "to'landi" xabarini yuborib buyurtmani yopib qo'yardi.
   */
  verifyWebhook(request: PaymentWebhookRequest): boolean;

  /**
   * Tekshirilgan webhook tanasini provayderdan mustaqil hodisaga
   * aylantiradi. Bazaga hech narsa yozmaydi.
   */
  handleWebhook(request: PaymentWebhookRequest): Promise<PaymentEvent>;
}

/** Provayderga buyurtmadan kerakli minimum — butun `Order` emas. */
export interface PaymentOrderRef {
  id: string;
  /** Ko'rinadigan raqam (`VK-2026-000001`) — to'lov izohida chiqadi. */
  orderNumber: string;
}

export interface PaymentIntent {
  /** Provayderdagi tranzaksiya ID si → `Payment.providerRef`. */
  providerRef: string;
  /** QR uchun matn — frontend o'zi chizadi → `Payment.qrPayload`. */
  qrPayload: string;
  /** Provayderning to'lov sahifasi (bo'lsa). */
  checkoutUrl?: string;
  /** Odatda `PENDING`. */
  status: PaymentStatus;
}

/** Webhook so'rovi — HTTP freymvorkidan mustaqil ko'rinishda. */
export interface PaymentWebhookRequest {
  /** Sarlavhalar, nomlari kichik harfda (Node `IncomingHttpHeaders` kabi). */
  headers: Record<string, string | string[] | undefined>;
  /** JSON tanasi, parse qilingan. */
  body: unknown;
}

/** Provayderdan kelgan xabarning provayderdan mustaqil ma'nosi. */
export interface PaymentEvent {
  providerRef: string;
  status: PaymentStatus;
  /** `status = PAID` bo'lsa — provayder aytgan to'lov vaqti (UTC). */
  paidAt?: Date;
  /**
   * 🔒 Shu XABARNING noyob kaliti. Bir xil xabar ikki marta kelsa
   *    (provayderlar qayta yuboradi), ikkinchisi hisobga olinmaydi (B-034).
   */
  eventId: string;
  /** Xom tana — `Payment.rawPayload` ga to'liq saqlanadi. */
  rawPayload: unknown;
  /**
   * Provayderga qaytariladigan javob tanasi (bo'lsa). Ba'zi provayderlar
   * (JSON-RPC uslubidagi) webhook javobida aniq tuzilma kutadi; berilmasa
   * oddiy `{ ok: true }` qaytadi.
   */
  reply?: unknown;
}

/** DI tokeni — `@Inject(PAYMENT_PROVIDER) provider: PaymentProvider`. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
