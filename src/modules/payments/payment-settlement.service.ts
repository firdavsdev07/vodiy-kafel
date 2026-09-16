import { Injectable } from '@nestjs/common';
import { AccountTransactionType, PaymentStatus } from '../../common/enums';
import type { Prisma } from '../../prisma';
import { AccountLedgerService } from '../accounts/account-ledger.service';

/** Yakunlanadigan to'lov haqida kerakli minimum. */
export interface SettlablePayment {
  id: string;
  amount: Prisma.Decimal;
  orderId: string;
  order: { orderNumber: string; customerId: string | null };
}

export interface SettleOptions {
  /** `PAID` uchun — to'lov vaqti; berilmasa hozir. */
  paidAt?: Date;
  /** Provayder xabari (webhook) — `Payment.rawPayload`. */
  rawPayload?: Prisma.InputJsonValue;
  /** Qo'lda tasdiqlagan xodim (naqd / o'tkazma). */
  confirmedByUserId?: string;
  note?: string;
}

/**
 * To'lovni yakuniy holatga o'tkazishning YAGONA joyi (B-034):
 * webhook ham, admin qo'lda tasdig'i ham shu yerdan o'tadi.
 *
 * 🔒 Faqat `PENDING` dan: `UPDATE … WHERE status = PENDING`. Ikki xabar
 *    (yoki xabar + admin tugmasi) bir vaqtda kelsa — bittasi yozadi,
 *    ikkinchisi `false` oladi. Shu tufayli hisobga to'lov IKKI MARTA
 *    tushmaydi.
 *
 * PAID bo'lganda mijoz hisobiga `PAYMENT` (manfiy) — AYNAN shu
 * tranzaksiyada. Hisobsiz xaridor (telefon buyurtmasi) — hisob yozuvi yo'q.
 */
@Injectable()
export class PaymentSettlementService {
  constructor(private readonly ledger: AccountLedgerService) {}

  async settle(
    tx: Prisma.TransactionClient,
    payment: SettlablePayment,
    status: typeof PaymentStatus.PAID | typeof PaymentStatus.FAILED,
    options: SettleOptions = {},
  ): Promise<boolean> {
    const paid = status === PaymentStatus.PAID;
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status,
        paidAt: paid ? (options.paidAt ?? new Date()) : null,
        ...(options.rawPayload !== undefined && {
          rawPayload: options.rawPayload,
        }),
      },
    });
    if (count === 0) return false;

    if (paid && payment.order.customerId) {
      await this.ledger.record(tx, {
        customerId: payment.order.customerId,
        type: AccountTransactionType.PAYMENT,
        amount: payment.amount.neg(),
        orderId: payment.orderId,
        paymentId: payment.id,
        createdByUserId: options.confirmedByUserId ?? null,
        note: options.note ?? `To‘lov: ${payment.order.orderNumber}`,
      });
    }
    return true;
  }
}
