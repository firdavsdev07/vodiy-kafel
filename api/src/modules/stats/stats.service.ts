import { Injectable } from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { OrderStatus, PaymentStatus, StockStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { ProductStocksService } from '../products/product-stocks.service';
import type { DashboardStatsDto } from './dto';

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
}

/**
 * Buyurtma yo'q bo'lsa `_sum` `null` qaytaradi — javobda `null` emas,
 * `"0"` bo'lishi kerak: frontend uni formatlab ko'rsatadi va `null` ni
 * har joyda alohida tekshirib o'tirmasligi kerak.
 */
function decimalToString(value: Prisma.Decimal | null): string {
  return (value ?? new Prisma.Decimal(0)).toString();
}
