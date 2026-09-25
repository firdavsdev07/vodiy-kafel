import { BadRequestException, Injectable } from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { OrderStatus, PaymentStatus, StockStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { toMoney } from '../../common/utils';
import { Prisma, PrismaService } from '../../prisma';
import { ProductStocksService } from '../products/product-stocks.service';
import {
  MAX_DAILY_STATS_DAYS,
  type DailyStatsDayDto,
  type DailyStatsDto,
  type DailyStatsQueryDto,
  type DashboardStatsDto,
} from './dto';

/**
 * Toshkent vaqti UTC dan 5 soat oldinda va yoz/qish o'tishi YO'Q
 * (O'zbekiston 2005 yildan beri DST ishlatmaydi), shuning uchun oddiy
 * qo'shish yetarli — soat mintaqasi kutubxonasi kerak emas.
 */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** «Bugun» va «shu oy» ning UTC boshlanishi (Toshkent kuni bo'yicha). */
export function tashkentPeriodStarts(now: Date): { day: Date; month: Date } {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const dayStartLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const monthStartLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    1,
  );
  return {
    day: new Date(dayStartLocal - TASHKENT_OFFSET_MS),
    month: new Date(monthStartLocal - TASHKENT_OFFSET_MS),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC vaqt → Toshkent kuni kaliti (`YYYY-MM-DD`). */
export function tashkentDayKey(at: Date): string {
  return new Date(at.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Davrdagi har bir Toshkent kuni — birinchi va oxirgi (qisman) kunlar ham. */
export function tashkentDaysBetween(from: Date, to: Date): string[] {
  const days: string[] = [];
  // `to` KIRMAYDI — oxirgi kun `to` dan bir millisekund oldingi lahza
  const last = tashkentDayKey(new Date(to.getTime() - 1));
  for (let key = tashkentDayKey(from); key <= last;) {
    days.push(key);
    key = new Date(Date.parse(`${key}T00:00:00Z`) + DAY_MS)
      .toISOString()
      .slice(0, 10);
  }
  return days;
}

/**
 * Bosh sahifa statistikasi (B-063).
 *
 * ⚠ Bu FAQAT O'QISH: hech narsa o'zgarmaydi, hech qanday yangi qoida
 *   kiritilmaydi. Har bir son mavjud admin ro'yxatining AYNAN o'sha
 *   filtri bilan hisoblanadi — kartochkadagi son bilan ro'yxatdagi son
 *   farq qilmasligi shart (D-041 talabi).
 *
 * 🔒 Filial izolyatsiyasi `BranchScopeService` orqali (B-051). Zaxira
 *    esa filialga bog'lanmagan (B-008) — u ataylab filtrsiz hisoblanadi
 *    va hamma xodim bir xil sonni ko'radi.
 */
@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly stocks: ProductStocksService,
  ) {}

  async dashboard(
    actor: Actor | undefined,
    requestedBranchId?: string,
  ): Promise<DashboardStatsDto> {
    const scope = this.branchScope.resolve(actor, requestedBranchId);
    const branchFilter = this.branchScope.toPrismaFilter(scope);
    const now = new Date();
    const { day, month } = tashkentPeriodStarts(now);

    const orderWhere = (extra: Prisma.OrderWhereInput = {}) => ({
      ...branchFilter,
      ...extra,
    });
    const customerWhere = (extra: Prisma.CustomerWhereInput = {}) => ({
      ...branchFilter,
      ...extra,
    });
    // `hasDebt=true` bilan bir xil: to'langan summadan ko'p xarid qilgan
    const totalPaid = this.prisma.customerAccount.fields.totalPaid;

    const globalLowThreshold = await this.stocks.getGlobalLowThreshold();

    const [
      newCount,
      urgentCount,
      unpaidCount,
      today,
      monthly,
      lowCount,
      outOfStockCount,
      activeCount,
      inDebtCount,
    ] = await Promise.all([
      this.prisma.order.count({
        where: orderWhere({ status: OrderStatus.NEW }),
      }),
      this.prisma.order.count({ where: orderWhere({ isUrgent: true }) }),
      this.prisma.order.count({
        where: orderWhere({
          payments: { some: { status: PaymentStatus.PENDING } },
        }),
      }),
      this.prisma.order.aggregate({
        where: orderWhere({ createdAt: { gte: day } }),
        _count: { _all: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.aggregate({
        where: orderWhere({ createdAt: { gte: month } }),
        _count: { _all: true },
        _sum: { grandTotal: true },
      }),
      // ⚠ Zaxira filialga bog'lanmagan — filtr QO'LLANMAYDI (B-008)
      this.prisma.product.count({
        where: this.stocks.stockStatusWhere(
          StockStatus.LOW,
          globalLowThreshold,
        ),
      }),
      this.prisma.product.count({
        where: this.stocks.stockStatusWhere(
          StockStatus.OUT_OF_STOCK,
          globalLowThreshold,
        ),
      }),
      this.prisma.customer.count({ where: customerWhere({ isActive: true }) }),
      this.prisma.customer.count({
        where: customerWhere({
          account: { is: { totalPurchased: { gt: totalPaid } } },
        }),
      }),
    ]);

    return {
      orders: {
        newCount,
        urgentCount,
        unpaidCount,
        todayCount: today._count._all,
        todayTotal: decimalToString(today._sum.grandTotal),
        monthCount: monthly._count._all,
        monthTotal: decimalToString(monthly._sum.grandTotal),
      },
      stock: { lowCount, outOfStockCount, globalLowThreshold },
      customers: { activeCount, inDebtCount },
      branchId: scope.kind === 'SINGLE' ? scope.branchId : null,
      generatedAt: now,
    };
  }

  /**
   * Kunlik statistika (T-010) — bosh sahifadagi chart uchun.
   *
   * Kunlar TOSHKENT vaqti bo'yicha; davr chegarasi soatgacha aniq
   * (`from` kiradi, `to` kirmaydi). Hisob BACKENDDA: bo'sh kunlar ham nol
   * bilan qaytadi — frontend hech narsa yig'maydi.
   *
   * 🔒 Doira — mijozlar domeni (T-001): SUPER_ADMIN va MODERATOR barcha
   *    filial (yoki `branchId`), filial xodimi — o'z filiali. Buyurtmalar
   *    ro'yxati bilan bir xil doira — chart va ro'yxat bir-biriga zid emas.
   */
  async daily(
    actor: Actor | undefined,
    query: DailyStatsQueryDto,
  ): Promise<DailyStatsDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (!(from < to)) {
      throw new BadRequestException('Davr boshi oxiridan oldin bo‘lishi kerak');
    }
    if (to.getTime() - from.getTime() > MAX_DAILY_STATS_DAYS * DAY_MS) {
      throw new BadRequestException(
        `Davr ${MAX_DAILY_STATS_DAYS} kundan oshmasin (eng ko‘pi 12 oy)`,
      );
    }

    const branchFilter = this.branchScope.toPrismaFilter(
      this.branchScope.resolve(actor, query.branchId, 'CUSTOMERS'),
    );
    const period = { gte: from, lt: to };

    const [orders, payments, customers] = await Promise.all([
      this.prisma.order.findMany({
        where: { ...branchFilter, createdAt: period },
        select: { createdAt: true, grandTotal: true, status: true },
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: period,
          order: branchFilter,
        },
        select: { paidAt: true, amount: true },
      }),
      this.prisma.customer.findMany({
        where: { ...branchFilter, createdAt: period },
        select: { createdAt: true },
      }),
    ]);

    type Bucket = {
      ordersCount: number;
      ordersTotal: Prisma.Decimal;
      cancelledCount: number;
      deliveredCount: number;
      paymentsTotal: Prisma.Decimal;
      newCustomers: number;
    };
    const empty = (): Bucket => ({
      ordersCount: 0,
      ordersTotal: toMoney(0),
      cancelledCount: 0,
      deliveredCount: 0,
      paymentsTotal: toMoney(0),
      newCustomers: 0,
    });
    const keys = tashkentDaysBetween(from, to);
    const buckets = new Map(keys.map((key) => [key, empty()]));
    const totals = empty();
    const bucket = (at: Date) => buckets.get(tashkentDayKey(at));

    for (const order of orders) {
      const b = bucket(order.createdAt);
      if (!b) continue;
      for (const t of [b, totals]) {
        t.ordersCount += 1;
        if (order.status === OrderStatus.CANCELLED) t.cancelledCount += 1;
        else t.ordersTotal = t.ordersTotal.add(order.grandTotal);
        if (order.status === OrderStatus.DELIVERED) t.deliveredCount += 1;
      }
    }
    for (const payment of payments) {
      const b = payment.paidAt && bucket(payment.paidAt);
      if (!b) continue;
      for (const t of [b, totals])
        t.paymentsTotal = t.paymentsTotal.add(payment.amount);
    }
    for (const customer of customers) {
      const b = bucket(customer.createdAt);
      if (!b) continue;
      b.newCustomers += 1;
      totals.newCustomers += 1;
    }

    const serialize = (t: Bucket) => ({
      ...t,
      ordersTotal: t.ordersTotal.toString(),
      paymentsTotal: t.paymentsTotal.toString(),
    });
    return {
      from,
      to,
      timezone: 'Asia/Tashkent',
      days: keys.map((date): DailyStatsDayDto => ({
        date,
        ...serialize(buckets.get(date)!),
      })),
      totals: serialize(totals),
    };
  }
}

/**
 * Buyurtma yo'q bo'lsa `_sum` `null` qaytaradi — javobda `null` emas,
 * `"0"` bo'lishi kerak: frontend uni formatlab ko'rsatadi va `null` ni
 * har joyda alohida tekshirib o'tirmasligi kerak.
 */
function decimalToString(value: Prisma.Decimal | null): string {
  return (value ?? new Prisma.Decimal(0)).toString();
}
