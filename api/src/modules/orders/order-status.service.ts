import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  AccountTransactionType,
  OrderStatus,
  PaymentStatus,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import { AccountLedgerService } from '../accounts/account-ledger.service';
import {
  AppEvent,
  type OrderStatusChangedEvent,
} from '../notifications/events';
import type {
  ChangeOrderStatusDto,
  OrderStatusChangeResponseDto,
  TrackOrderResponseDto,
} from './dto';
import { allowedNextStatuses, canTransition } from './order-status';

/** Mavjud emas, begona filialniki, telefon mos emas — BIR XIL javob. */
const ORDER_NOT_FOUND = 'Buyurtma topilmadi';

/** O'zbekiston raqamining mahalliy qismi — 9 xona (90 123 45 67). */
const LOCAL_PHONE_DIGITS = 9;

/**
 * Telefonni solishtirish uchun: faqat raqamlar, oxirgi 9 xona.
 * `+998 90 123-45-67`, `998901234567` va `901234567` — bitta raqam.
 */
export const phoneKey = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= LOCAL_PHONE_DIGITS
    ? digits.slice(-LOCAL_PHONE_DIGITS)
    : null;
};

/**
 * Buyurtma holati (B-029, TZ 3.4).
 *
 * ⚠ Bildirishnoma (`order.status.changed`) — B-037 bilan ulanadi.
 */
@Injectable()
export class OrderStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly ledger: AccountLedgerService,
    private readonly events: EventEmitter2,
  ) {}

  async change(
    actor: Actor | undefined,
    orderId: string,
    dto: ChangeOrderStatusDto,
  ): Promise<OrderStatusChangeResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        branchId: true,
        transportTypeId: true,
        customerId: true,
        orderNumber: true,
      },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);

    // 🔒 Filial izolyatsiyasi (B-051). Filialsiz buyurtma bo'lmasligi kerak,
    //    bo'lsa ham — faqat SUPER_ADMIN ko'radi (bo'sh ID hech kimga mos emas).
    this.branchScope.assertWithinScope(
      actor,
      order.branchId ?? '',
      ORDER_NOT_FOUND,
    );

    const hasDelivery = order.transportTypeId !== null;
    if (dto.status === order.status) {
      throw new BadRequestException('Buyurtma allaqachon shu holatda');
    }
    if (!canTransition(order.status, dto.status, hasDelivery)) {
      const allowed = allowedNextStatuses(order.status, hasDelivery);
      throw new BadRequestException(
        `${order.status} → ${dto.status} o‘tishi mumkin emas. ` +
          (allowed.length
            ? `Ruxsat etilgan: ${allowed.join(', ')}`
            : 'Bu yakuniy holat'),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Optimistik qulf: holat tekshiruvdan keyin boshqa xodim tomonidan
      // o'zgargan bo'lsa, yangilanadigan qator topilmaydi. Aks holda ikki
      // xodim bir vaqtda NEW dan turli holatga o'tkazib, tarixni buzardi.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: dto.status },
      });
      if (count === 0) {
        throw new ConflictException(
          'Buyurtma holati hozirgina boshqa xodim tomonidan o‘zgartirildi — sahifani yangilang',
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: dto.status,
          changedByUserId: actor?.type === 'USER' ? actor.id : null,
          note: dto.note ?? null,
        },
      });

      // Bekor qilingan buyurtma to'lanmaydi (B-034): kutilayotgan to'lov
      // ham bekor. Kechikib kelgan "to'landi" webhook'i endi IGNORED bo'ladi
      // va qo'lda tekshirish uchun ogohlantirish yoziladi. PAID to'lov
      // o'zgarmaydi — pulni qaytarish teskari ADJUSTMENT bilan (qoida 9).
      if (dto.status === OrderStatus.CANCELLED) {
        await tx.payment.updateMany({
          where: { orderId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });

        // Qarzni qaytarish (B-035): buyurtma bo'yicha yozilgan qarz qancha
        // bo'lsa, shuncha teskari ADJUSTMENT. Summa buyurtmadan emas,
        // HISOBDAN olinadi — qarz yozilmagan eski buyurtmada ikki marta
        // "kamaytirib" yubormaslik uchun. To'langan pul qaytmaydi: mijozda
        // avans (manfiy balans) qoladi, qaytarish — alohida ADJUSTMENT.
        if (order.customerId) {
          const { _sum } = await tx.accountTransaction.aggregate({
            where: { orderId, type: AccountTransactionType.DEBT },
            _sum: { amount: true },
          });
          if (_sum.amount?.isPositive() && !_sum.amount.isZero()) {
            await this.ledger.record(tx, {
              customerId: order.customerId,
              type: AccountTransactionType.ADJUSTMENT,
              amount: _sum.amount.neg(),
              orderId,
              createdByUserId: actor?.type === 'USER' ? actor.id : null,
              note: `Buyurtma ${order.orderNumber} bekor qilindi`,
            });
          }
        }
      }
    });

    this.events.emit(AppEvent.OrderStatusChanged, {
      orderId,
      from: order.status,
      to: dto.status,
      note: dto.note ?? null,
    } satisfies OrderStatusChangedEvent);
    return this.getAdminStatus(orderId);
  }

  /**
   * Ochiq kuzatuv — buyurtma raqami + egasining telefoni.
   *
   * 🔒 Raqamlar ketma-ket (VK-2026-000001, 000002…) — ularni sanab chiqish
   *    oson. Shuning uchun telefon tasdig'i shart va mos kelmasa javob
   *    "topilmadi" bilan AYNAN bir xil. Javobda summa, tarkib, izoh yo'q.
   *    Filialning ta'minot buyurtmasi (egasi telefoni yo'q) — kuzatilmaydi.
   */
  async track(
    orderNumber: string,
    phone: string,
  ): Promise<TrackOrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        guestPhone: true,
        customer: { select: { phone: true } },
        region: { select: { name: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: { status: true, createdAt: true },
        },
      },
    });

    const requested = phoneKey(phone);
    const owners = [order?.customer?.phone, order?.guestPhone]
      .filter((value): value is string => Boolean(value))
      .map(phoneKey);

    if (!order || !requested || !owners.includes(requested)) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      regionName: order.region?.name ?? null,
      createdAt: order.createdAt,
    };
  }

  private async getAdminStatus(
    orderId: string,
  ): Promise<OrderStatusChangeResponseDto> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        transportTypeId: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: true,
            note: true,
            createdAt: true,
            changedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      allowedNextStatuses: [
        ...allowedNextStatuses(order.status, order.transportTypeId !== null),
      ] as OrderStatus[],
      statusHistory: order.statusHistory,
    };
  }
}
