import { Logger } from '@nestjs/common';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PaymentStatus } from '../../../common/enums';
import type { Money } from '../../../common/utils';
import type {
  PaymentEvent,
  PaymentIntent,
  PaymentOrderRef,
  PaymentProvider,
  PaymentWebhookRequest,
} from './payment-provider.interface';

/** Mock webhook imzosi shu sarlavhada keladi. */
export const MOCK_SIGNATURE_HEADER = 'x-mock-signature';

/** `PAYMENT_MOCK_AUTO_PAID=true` bo'lganda kutish vaqti (TZ: 10 soniya). */
export const MOCK_AUTO_PAID_DELAY_MS = 10_000;

type SimulatedStatus = typeof PaymentStatus.PAID | typeof PaymentStatus.FAILED;

interface MockWebhookBody {
  eventId: string;
  providerRef: string;
  status: SimulatedStatus;
  paidAt: string | null;
}

/**
 * 🧪 Soxta to'lov provayderi (B-033) — haqiqiy pul harakati yo'q.
 *
 * Holat faqat xotirada: server qayta ishga tushsa unutiladi, lekin
 * haqiqat manbai baribir baza (`Payment.status`), bu yerdagi emas.
 *
 * 🔒 Webhook imzosi — jarayon ishga tushganda yaratiladigan TASODIFIY
 *    kalit. Uni faqat shu klass biladi, ya'ni mock webhook'ni faqat
 *    `buildWebhook` yasay oladi (dev endpoint va avto-to'lov). Taskda
 *    "mock'da har doim true" deyilgan edi, lekin unda ochiq
 *    `/webhooks/payment` ga istalgan odam "PAID" yuborib, buyurtmani
 *    tekinga yopib qo'yardi.
 */
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly secret = randomBytes(32).toString('hex');

  private readonly statuses = new Map<string, PaymentStatus>();
  private readonly intentsByKey = new Map<string, PaymentIntent>();
  private autoPayListener?: (request: PaymentWebhookRequest) => unknown;

  constructor(
    private readonly options: { autoPaid: boolean; autoPaidDelayMs?: number },
  ) {}

  createPayment(
    order: PaymentOrderRef,
    amount: Money,
    idempotencyKey: string,
  ): Promise<PaymentIntent> {
    const existing = this.intentsByKey.get(idempotencyKey);
    if (existing) {
      return Promise.resolve({
        ...existing,
        status: this.statuses.get(existing.providerRef) ?? existing.status,
      });
    }

    const providerRef = `mock_${randomUUID()}`;
    const intent: PaymentIntent = {
      providerRef,
      qrPayload:
        `MOCKPAY|ref=${providerRef}|order=${order.orderNumber}` +
        `|amount=${amount.toFixed(2)}`,
      status: PaymentStatus.PENDING,
    };
    this.statuses.set(providerRef, PaymentStatus.PENDING);
    this.intentsByKey.set(idempotencyKey, intent);

    if (this.options.autoPaid) {
      this.scheduleAutoPaid(providerRef);
    }
    return Promise.resolve(intent);
  }

  /** Noma'lum `providerRef` (masalan server qayta ishga tushgan) — PENDING. */
  checkStatus(providerRef: string): Promise<PaymentStatus> {
    return Promise.resolve(
      this.statuses.get(providerRef) ?? PaymentStatus.PENDING,
    );
  }

  verifyWebhook(request: PaymentWebhookRequest): boolean {
    const header = request.headers[MOCK_SIGNATURE_HEADER];
    if (typeof header !== 'string') return false;

    const given = Buffer.from(header);
    const expected = Buffer.from(this.secret);
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  handleWebhook(request: PaymentWebhookRequest): Promise<PaymentEvent> {
    const body = request.body as MockWebhookBody;
    return Promise.resolve({
      eventId: body.eventId,
      providerRef: body.providerRef,
      status: body.status,
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
      rawPayload: body,
    });
  }

  /**
   * Provayder "to'landi/rad etildi" deb webhook yuborgandek so'rov yasaydi
   * — imzosi bilan. Dev endpoint (`/dev/payments/:id/simulate`) va
   * avto-to'lov AYNAN haqiqiy webhook yo'lidan o'tishi uchun.
   */
  buildWebhook(
    providerRef: string,
    status: SimulatedStatus,
  ): PaymentWebhookRequest {
    this.statuses.set(providerRef, status);
    const body: MockWebhookBody = {
      eventId: `mock_evt_${randomUUID()}`,
      providerRef,
      status,
      paidAt: status === PaymentStatus.PAID ? new Date().toISOString() : null,
    };
    return { headers: { [MOCK_SIGNATURE_HEADER]: this.secret }, body };
  }

  /** Avto-to'lov webhook'ini kim qabul qilishini modul ulaydi. */
  onAutoPay(listener: (request: PaymentWebhookRequest) => unknown): void {
    this.autoPayListener = listener;
  }

  private scheduleAutoPaid(providerRef: string): void {
    const timer = setTimeout(() => {
      if (this.statuses.get(providerRef) !== PaymentStatus.PENDING) return;
      if (!this.autoPayListener) {
        this.logger.warn(`Avto-to‘lov qabul qiluvchisi yo‘q: ${providerRef}`);
        return;
      }
      Promise.resolve(
        this.autoPayListener(
          this.buildWebhook(providerRef, PaymentStatus.PAID),
        ),
      ).catch((error: unknown) =>
        this.logger.error(`Avto-to‘lov xatosi: ${providerRef}`, error),
      );
    }, this.options.autoPaidDelayMs ?? MOCK_AUTO_PAID_DELAY_MS);
    // Test va to'xtatish paytida jarayonni ushlab turmasin.
    timer.unref();
  }
}
