import { BadRequestException, Injectable } from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type { UpdatesResponseDto } from './dto/updates.dto';
import { NotificationsInboxService } from './notifications-inbox.service';

/** Bitta javobdagi maksimal yozuv — undan ko'p bo'lsa `truncated`. */
const MAX_ITEMS = 100;

/**
 * Real-vaqt kuzatuv — POLLING (B-039, TZ 5-bo'lim). Frontend ~15 soniyada
 * chaqiradi; javob faqat `since` dan keyin o'zgarganlar.
 *
 * ⚠ `serverTime` so'rovlar BOSHLANISHIDAN oldin olinadi: shu oraliqda
 *   o'zgargan yozuv keyingi javobda ham kelishi mumkin (takror — zararsiz,
 *   frontend ID bo'yicha birlashtiradi), lekin hech qachon tushib qolmaydi.
 *
 * 🔁 Keyinroq SSE ga o'tsa — javob shakli o'zgarmaydi.
 */
@Injectable()
export class UpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox: NotificationsInboxService,
    private readonly branchScope: BranchScopeService,
  ) {}

  async getUpdates(
    actor: Actor | undefined,
    since: string | undefined,
  ): Promise<UpdatesResponseDto> {
    const serverTime = new Date();
    // Egasi + faollik tekshiruvi (401) — qutidan qayta foydalaniladi.
    const { count: unreadCount } = await this.inbox.unreadCount(actor);

    if (!since) {
      return {
        orders: [],
        notifications: [],
        unreadCount,
        truncated: false,
        serverTime,
      };
    }
    const from = new Date(since);
    if (from > serverTime) {
      throw new BadRequestException(
        'since kelajakdagi vaqt bo‘lishi mumkin emas',
      );
    }

    const [orders, notifications] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...this.orderOwner(actor!),
          OR: [
            { updatedAt: { gt: from } },
            { payments: { some: { updatedAt: { gt: from } } } },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          updatedAt: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: MAX_ITEMS + 1,
      }),
      this.inbox.findSince(actor, from, MAX_ITEMS + 1),
    ]);

    return {
      orders: orders.slice(0, MAX_ITEMS).map(({ payments, ...order }) => ({
        ...order,
        paymentStatus: payments[0]?.status ?? null,
      })),
      notifications: notifications.slice(0, MAX_ITEMS),
      unreadCount,
      truncated: orders.length > MAX_ITEMS || notifications.length > MAX_ITEMS,
      serverTime,
    };
  }

  /**
   * Mijoz — o'z buyurtmalari. Xodim — filial doirasi (B-051): SUPER_ADMIN
   * hammasi, qolganlari o'z filiali.
   */
  private orderOwner(actor: Actor): Prisma.OrderWhereInput {
    if (actor.type === 'CUSTOMER') return { customerId: actor.id };
    return this.branchScope.toPrismaFilter(this.branchScope.resolve(actor));
  }
}
