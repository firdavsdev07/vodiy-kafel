import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type {
  NotificationDto,
  NotificationQueryDto,
  ReadAllResponseDto,
  UnreadCountDto,
} from './dto/notification.dto';

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  payload: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;

type Owner = { customerId: string } | { userId: string };

/**
 * Bildirishnomalar qutisi (B-038, TZ 3.6) — optom mijoz kabineti VA admin
 * panel uchun bitta API: egasi tokendan (mijoz → `customerId`, xodim →
 * `userId`).
 *
 * 🔒 Har so'rov egasi filtri bilan; begona bildirishnoma — 404 (qoida 6).
 * 🔒 O'chirilgan hisob (token hali amalda) — 401.
 */
@Injectable()
export class NotificationsInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(
    actor: Actor | undefined,
    query: NotificationQueryDto,
  ): Promise<PaginatedResult<NotificationDto>> {
    const where: Prisma.NotificationWhereInput = {
      ...(await this.owner(actor)),
      ...(query.isRead !== undefined && { isRead: query.isRead }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy: [{ createdAt: query.sortOrder }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return paginate(rows.map(toDto), total, query);
  }

  async unreadCount(actor: Actor | undefined): Promise<UnreadCountDto> {
    const count = await this.prisma.notification.count({
      where: { ...(await this.owner(actor)), isRead: false },
    });
    return { count };
  }

  /** `from` dan keyin kelganlar, yangilari birinchi (B-039 polling). */
  async findSince(
    actor: Actor | undefined,
    from: Date,
    take: number,
  ): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { ...(await this.owner(actor)), createdAt: { gt: from } },
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take,
    });
    return rows.map(toDto);
  }

  /** Idempotent: allaqachon o'qilgan bo'lsa `readAt` o'zgarmaydi. */
  async markRead(
    actor: Actor | undefined,
    notificationId: string,
  ): Promise<NotificationDto> {
    const owner = await this.owner(actor);
    await this.prisma.notification.updateMany({
      where: { id: notificationId, ...owner, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, ...owner },
      select: NOTIFICATION_SELECT,
    });
    if (!row) throw new NotFoundException('Bildirishnoma topilmadi');
    return toDto(row);
  }

  async markAllRead(actor: Actor | undefined): Promise<ReadAllResponseDto> {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...(await this.owner(actor)), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }

  private async owner(actor: Actor | undefined): Promise<Owner> {
    if (actor?.type === 'CUSTOMER') {
      const customer = await this.prisma.customer.findUnique({
        where: { id: actor.id },
        select: { isActive: true },
      });
      if (!customer?.isActive)
        throw new UnauthorizedException('Hisob faol emas');
      return { customerId: actor.id };
    }
    if (actor?.type === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { isActive: true },
      });
      if (!user?.isActive) throw new UnauthorizedException('Hisob faol emas');
      return { userId: actor.id };
    }
    throw new UnauthorizedException('Kirish talab etiladi');
  }
}

function toDto(
  row: Prisma.NotificationGetPayload<{ select: typeof NOTIFICATION_SELECT }>,
): NotificationDto {
  return {
    ...row,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
  };
}
