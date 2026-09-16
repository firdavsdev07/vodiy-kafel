import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus } from '../../common/enums';
import { Prisma, PrismaService } from '../../prisma';
import { AppEvent, type PaymentPaidEvent } from '../notifications/events';
import { PaymentSettlementService } from './payment-settlement.service';
import {
  PAYMENT_PROVIDER,
  type PaymentEvent,
  type PaymentProvider,
  type PaymentWebhookRequest,
} from './providers';

/**
 * Webhook natijasi:
 *   APPLIED   — holat o'zgardi
 *   DUPLICATE — xuddi shu holat allaqachon yozilgan (qayta kelgan xabar)
 *   IGNORED   — to'lov yakuniy holatda yoki xabar holatni o'zgartirmaydi
 *   UNKNOWN   — bunday `providerRef` bizda yo'q
 */
export type PaymentWebhookOutcome =
  'APPLIED' | 'DUPLICATE' | 'IGNORED' | 'UNKNOWN';

export interface PaymentWebhookResult {
  outcome: PaymentWebhookOutcome;
  paymentId: string | null;
  status: PaymentStatus | null;
  /** Provayderga qaytariladigan javob. */
  reply: unknown;
}

/**
 * Provayderdan kelgan xabarni bazaga qo'llaydi (B-033, B-034).
 *
 * Qaysi provayder ekanini bilmaydi — faqat `PaymentProvider` interfeysi.
 * Haqiqiy webhook ham, dev simulyatsiya ham, mock avto-to'lov ham AYNAN
 * shu yo'ldan o'tadi. Holatni o'zgartirish va hisob yozuvi —
 * `PaymentSettlementService` (admin tasdig'i bilan umumiy).
 *
 * 🔒 Idempotentlik: holat faqat `PENDING` dan o'tadi (optimistik qulf).
 *    Bir xil xabar ikki marta kelsa yoki ikki xabar bir vaqtda kelsa —
 *    faqat bittasi yoziladi, qolgani DUPLICATE/IGNORED.
 */
@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: PaymentSettlementService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly events: EventEmitter2,
  ) {}

  async process(request: PaymentWebhookRequest): Promise<PaymentWebhookResult> {
    if (!this.provider.verifyWebhook(request)) {
      throw new UnauthorizedException('Webhook imzosi noto‘g‘ri');
    }
    const event = await this.provider.handleWebhook(request);
    const result = await this.apply(event);

    const line =
      `webhook ${event.eventId}: ${event.providerRef} → ${event.status} ` +
      `(${result.outcome})`;
    if (
      result.outcome === 'UNKNOWN' ||
      (result.outcome === 'IGNORED' && event.status === PaymentStatus.PAID)
    ) {
      // Pul tushgan bo'lishi mumkin, lekin tizim uni qabul qilmadi
      // (to'lov bekor qilingan / topilmadi) — odam ko'rib chiqishi kerak.
      this.logger.warn(`${line} — QO‘LDA TEKSHIRING`);
    } else {
      this.logger.log(line);
    }
    if (
      result.outcome === 'APPLIED' &&
      result.status === PaymentStatus.PAID &&
      result.paymentId
    ) {
      this.events.emit(AppEvent.PaymentPaid, {
        paymentId: result.paymentId,
      } satisfies PaymentPaidEvent);
    }
    return { ...result, reply: event.reply ?? { ok: true } };
  }

  private async apply(
    event: PaymentEvent,
  ): Promise<Omit<PaymentWebhookResult, 'reply'>> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerRef: event.providerRef },
        select: {
          id: true,
          status: true,
          amount: true,
          orderId: true,
          order: { select: { orderNumber: true, customerId: true } },
        },
      });
      if (!payment) {
        return { outcome: 'UNKNOWN', paymentId: null, status: null };
      }

      const unchanged = { paymentId: payment.id, status: payment.status };
      if (payment.status === event.status) {
        return { outcome: 'DUPLICATE', ...unchanged };
      }
      if (
        payment.status !== PaymentStatus.PENDING ||
        (event.status !== PaymentStatus.PAID &&
          event.status !== PaymentStatus.FAILED)
      ) {
        return { outcome: 'IGNORED', ...unchanged };
      }

      const applied = await this.settlement.settle(tx, payment, event.status, {
        paidAt: event.paidAt,
        rawPayload: event.rawPayload as Prisma.InputJsonValue,
      });
      if (!applied) {
        // Parallel xabar bizdan oldin yozib ulgurdi.
        return { outcome: 'DUPLICATE', ...unchanged };
      }

      return {
        outcome: 'APPLIED',
        paymentId: payment.id,
        status: event.status,
      };
    });
  }
}
