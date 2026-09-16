import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountTransactionType } from '../../common/enums';
import { toMoney } from '../../common/utils';
import type { Prisma } from '../../prisma';

export interface LedgerEntry {
  customerId: string;
  type: AccountTransactionType;
  /**
   * ISHORALI summa (B-011): DEBT musbat, PAYMENT manfiy, ADJUSTMENT
   * ikkalasi. Baza ham CHECK bilan tekshiradi — bu yerda esa tushunarli
   * xato chiqishi uchun.
   */
  amount: Prisma.Decimal.Value;
  orderId?: string | null;
  paymentId?: string | null;
  createdByUserId?: string | null;
  note?: string | null;
}

/**
 * Mijoz hisobiga pul harakatini yozishning YAGONA joyi (TZ 3.11,
 * CLAUDE.md qoida 9).
 *
 * Har yozuv = yangi `AccountTransaction` (audit trail) + keshlangan
 * `CustomerAccount` yig'indisi SHU tranzaksiya ichida. Balans hech qachon
 * to'g'ridan-to'g'ri yozilmaydi; tranzaksiyani o'zgartirish/o'chirish baza
 * triggeri bilan to'silgan.
 *
 * ⚠ Faqat chaqiruvchining `$transaction` i ichida ishlaydi (`tx`) — yozuv
 *   va unga sabab bo'lgan o'zgarish (masalan to'lov PAID) birga yoki
 *   umuman yozilmasligi kerak.
 */
@Injectable()
export class AccountLedgerService {
  async record(
    tx: Prisma.TransactionClient,
    entry: LedgerEntry,
  ): Promise<void> {
    const amount = toMoney(entry.amount);
    assertSign(entry.type, amount);

    // Musbat harakat — "sotib olingan"ga, manfiy — "to'langan"ga (modulda).
    const purchased = amount.isPositive() ? amount : toMoney(0);
    const paid = amount.isNegative() ? amount.neg() : toMoney(0);

    await tx.accountTransaction.create({
      data: {
        customerId: entry.customerId,
        type: entry.type,
        amount,
        orderId: entry.orderId ?? null,
        paymentId: entry.paymentId ?? null,
        createdByUserId: entry.createdByUserId ?? null,
        note: entry.note ?? null,
      },
    });

    await tx.customerAccount.upsert({
      where: { customerId: entry.customerId },
      create: {
        customerId: entry.customerId,
        totalPurchased: purchased,
        totalPaid: paid,
      },
      update: {
        totalPurchased: { increment: purchased },
        totalPaid: { increment: paid },
      },
    });
  }
}

function assertSign(
  type: AccountTransactionType,
  amount: Prisma.Decimal,
): void {
  const ok =
    (type === AccountTransactionType.DEBT && amount.isPositive()) ||
    (type === AccountTransactionType.PAYMENT && amount.isNegative()) ||
    (type === AccountTransactionType.ADJUSTMENT && !amount.isZero());
  if (!ok || amount.isZero()) {
    throw new BadRequestException(
      'Summa ishorasi harakat turiga mos emas: qarz — musbat, to‘lov — ' +
        'manfiy, tuzatish — noldan farqli',
    );
  }
}
