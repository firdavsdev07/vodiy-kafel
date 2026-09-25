import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import { AppEvent, type PaymentPaidEvent } from '../notifications/events';
import type {
  AdminPaymentResponseDto,
  ConfirmPaymentDto,
  PaymentStatusResponseDto,
  StartPaymentDto,
  StartPaymentResponseDto,
} from './dto';
import { PaymentSettlementService } from './payment-settlement.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './providers';

const ORDER_NOT_FOUND = 'Buyurtma topilmadi';
const PAYMENT_NOT_FOUND = 'To‘lov topilmadi';

const PAYMENT_SELECT = {
  id: true,
  method: true,
  status: true,
  amount: true,
  providerRef: true,
  qrPayload: true,
  idempotencyKey: true,
} as const;

/**
 * To'lov oqimi (B-034, TZ 3.4).
 *
 * Qoidalar:
 *   • Summa — buyurtmaning backendda hisoblangan `grandTotal`i (qoida 1).
 *     So'rovda summa umuman qabul qilinmaydi.
 *   • Bitta buyurtmada bir vaqtda ko'pi bilan BITTA `PENDING` to'lov.
 *   • CARD — provayder orqali (QR). CASH / BANK_TRANSFER — provayderga
 *     bormaydi, admin tasdiqlaydi.
 *   • 🔒 Mijoz faqat O'Z buyurtmasi/to'lovi — begonasi 404 (qoida 6).
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuoteService,
    private readonly branchScope: BranchScopeService,
    private readonly settlement: PaymentSettlementService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * To'lovni boshlash yoki usulini almashtirish. Takror chaqirilsa
   * (tugma ikki marta bosilsa) — o'sha to'lov qaytadi, yangisi ochilmaydi.
   */
  async start(
    actor: Actor | undefined,
    orderId: string,
    dto: StartPaymentDto,
  ): Promise<StartPaymentResponseDto> {
    const { customerId } = await this.quotes.requireCustomer(actor);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: PAYMENT_SELECT,
        },
      },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Bekor qilingan buyurtma to‘lanmaydi');
    }
    if (order.payments.some((p) => p.status === PaymentStatus.PAID)) {
      throw new ConflictException('Buyurtma allaqachon to‘langan');
    }

    const pending = order.payments.find(
      (p) => p.status === PaymentStatus.PENDING,
    );
    let payment = await this.preparePending(order, pending, dto.method);

    if (payment.method === PaymentMethod.CARD && !payment.providerRef) {
      // Tarmoq so'rovi — DB tranzaksiyasidan tashqarida. Parallel so'rovlar
      // bir xil idempotencyKey yuboradi: provayder yangi to'lov ochmaydi.
      const intent = await this.provider.createPayment(
        { id: order.id, orderNumber: order.orderNumber },
        payment.amount,
        payment.idempotencyKey,
      );
      await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
          providerRef: null,
        },
        data: { providerRef: intent.providerRef, qrPayload: intent.qrPayload },
      });
      payment = await this.prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
        select: PAYMENT_SELECT,
      });
    }

    return {
      paymentId: payment.id,
      method: payment.method,
      status: payment.status,
      amount: payment.amount.toString(),
      qrPayload: payment.qrPayload,
    };
  }

  async getStatus(
    actor: Actor | undefined,
    paymentId: string,
  ): Promise<PaymentStatusResponseDto> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { customerId } },
      select: { id: true, status: true, paidAt: true },
    });
    if (!payment) throw new NotFoundException(PAYMENT_NOT_FOUND);

    return {
      paymentId: payment.id,
      status: payment.status,
      paidAt: payment.paidAt,
    };
  }

  /**
   * Naqd pul / shartnoma o'tkazmasi tushganini xodim tasdiqlaydi.
   *
   * 🔒 Karta to'lovi bu yo'ldan TASDIQLANMAYDI — u faqat provayder
   *    webhook'i bilan PAID bo'ladi. Aks holda xodim pul tushmagan karta
   *    to'lovini "to'landi" qilib qo'yishi mumkin edi.
   */
  async confirm(
    actor: Actor | undefined,
    paymentId: string,
    dto: ConfirmPaymentDto,
  ): Promise<AdminPaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        method: true,
        status: true,
        amount: true,
        orderId: true,
        order: {
          select: { orderNumber: true, customerId: true, branchId: true },
        },
      },
    });
    if (!payment) throw new NotFoundException(PAYMENT_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      payment.order.branchId ?? '',
      PAYMENT_NOT_FOUND,
      'CUSTOMERS',
    );

    if (payment.method === PaymentMethod.CARD) {
      throw new BadRequestException(
        'Karta to‘lovi faqat to‘lov tizimi orqali tasdiqlanadi',
      );
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(
        payment.status === PaymentStatus.PAID
          ? 'To‘lov allaqachon tasdiqlangan'
          : `To‘lov holati ${payment.status} — tasdiqlab bo‘lmaydi`,
      );
    }

    const applied = await this.prisma.$transaction((tx) =>
      this.settlement.settle(tx, payment, PaymentStatus.PAID, {
        confirmedByUserId: actor?.type === 'USER' ? actor.id : undefined,
        note: dto.note,
      }),
    );
    if (!applied) {
      throw new ConflictException(
        'To‘lov holati hozirgina o‘zgardi — sahifani yangilang',
      );
    }
    this.events.emit(AppEvent.PaymentPaid, {
      paymentId: payment.id,
    } satisfies PaymentPaidEvent);

    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: { status: true, paidAt: true },
    });
    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      method: payment.method,
      status: updated.status,
      amount: payment.amount.toString(),
      paidAt: updated.paidAt,
    };
  }

  /**
   * Kerakli usuldagi `PENDING` to'lov yozuvini tayyorlaydi:
   *   • o'sha usulda bor — o'zi;
   *   • boshqa usulda, provayderga hali bormagan — usuli almashtiriladi;
   *   • boshqa usulda, provayderda ochilgan — u BEKOR qilinadi va yangisi
   *     yaratiladi (eski `providerRef` yo'qolmasin: kechikib kelgan webhook
   *     uni topishi va IGNORED + ogohlantirish berishi kerak);
   *   • yo'q (hammasi FAILED/CANCELLED) — yangisi.
   */
  private async preparePending(
    order: { id: string; grandTotal: { toString(): string } },
    pending:
      | {
          id: string;
          method: PaymentMethod;
          providerRef: string | null;
        }
      | undefined,
    method: PaymentMethod,
  ) {
    if (pending?.method === method) {
      return this.prisma.payment.findUniqueOrThrow({
        where: { id: pending.id },
        select: PAYMENT_SELECT,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (pending && !pending.providerRef) {
        const { count } = await tx.payment.updateMany({
          where: { id: pending.id, status: PaymentStatus.PENDING },
          data: { method },
        });
        if (count === 0) throw this.changedConflict();
        return tx.payment.findUniqueOrThrow({
          where: { id: pending.id },
          select: PAYMENT_SELECT,
        });
      }

      if (pending) {
        const { count } = await tx.payment.updateMany({
          where: { id: pending.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });
        if (count === 0) throw this.changedConflict();
      }

      return tx.payment.create({
        data: {
          orderId: order.id,
          method,
          amount: order.grandTotal.toString(),
          status: PaymentStatus.PENDING,
          idempotencyKey: randomUUID(),
        },
        select: PAYMENT_SELECT,
      });
    });
  }

  private changedConflict(): ConflictException {
    return new ConflictException(
      'To‘lov holati hozirgina o‘zgardi — qayta urinib ko‘ring',
    );
  }
}
