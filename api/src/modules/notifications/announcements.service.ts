import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import {
  AnnouncementAudience,
  NotificationType,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import {
  IMAGE_KINDS,
  requireFileKind,
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFileData,
} from '../../storage';
import {
  DEFAULT_ANNOUNCEMENT_TITLE,
  type AnnouncementDto,
  type AnnouncementQueryDto,
  type CreateAnnouncementDto,
} from './dto/announcement.dto';
import { NotificationService } from './notification.service';

/** Bir martada nechta qabul qiluvchiga yoziladi (bazani bosmaslik). */
const DISPATCH_CHUNK = 100;

const SENDER_ROLES: readonly string[] = [
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
];

/** Hamma yuborilgan xabarlar tarixini ko'radigan rollar. */
const SEES_ALL_HISTORY: readonly string[] = [
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
];

const SELECT = {
  id: true,
  title: true,
  body: true,
  imageUrl: true,
  audience: true,
  recipientCount: true,
  createdAt: true,
  createdBy: { select: { id: true, fullName: true } },
} as const satisfies Prisma.AnnouncementSelect;

/**
 * Mijozlarga oddiy xabar — bayram, e'lon (T-009).
 *
 * 🔒 Kim kimga (mijoz qarori, 2026-09-25):
 *   SUPER_ADMIN, MODERATOR — hamma mijozga (mijozlar domeni, T-001);
 *   BRANCH_ADMIN           — o'z filiali mijozlariga;
 *   MANAGER                — FAQAT o'ziga biriktirilgan mijozlarga.
 * "Barchasiga" = yuboruvchi DOIRASIDAGI barcha faol mijozlar. Tanlangan
 * ro'yxatda doiradan tashqari bitta ID bo'lsa ham — 404, hech kimga
 * yuborilmaydi (mavjudligi oshkor qilinmaydi, qoida 5-6).
 *
 * Yetkazish — umumiy bildirishnoma yo'li (`NotificationService.dispatch`,
 * qoida 10): kabinetda rasm + ostida matn.
 */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly notifications: NotificationService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async create(
    actor: Actor | undefined,
    dto: CreateAnnouncementDto,
    image: UploadedFileData | undefined,
  ): Promise<AnnouncementDto> {
    const senderId = this.requireSender(actor);
    const scope = this.recipientScope(actor);
    const selected = dto.audience === AnnouncementAudience.SELECTED;
    const ids = selected ? [...new Set(dto.customerIds ?? [])] : [];
    if (selected && ids.length === 0) {
      throw new BadRequestException('Kamida bitta mijozni tanlang');
    }

    const where: Prisma.CustomerWhereInput = {
      ...scope,
      isActive: true,
      ...(selected && { id: { in: ids } }),
    };
    const recipientCount = await this.prisma.customer.count({ where });
    if (selected && recipientCount !== ids.length) {
      // Doiradan tashqari, faol emas yoki mavjud bo'lmagan — farqlanmaydi
      throw new NotFoundException(
        'Tanlangan mijozlardan ba’zilari topilmadi yoki sizga biriktirilmagan',
      );
    }
    if (recipientCount === 0) {
      throw new BadRequestException('Xabar yuboriladigan faol mijoz yo‘q');
    }

    // Rasm faqat hamma tekshiruvdan keyin saqlanadi — rad etilgan so'rov
    // diskda yetim fayl qoldirmasin.
    let imageUrl: string | null = null;
    if (image?.size) {
      const { buffer, kind } = requireFileKind(
        image,
        IMAGE_KINDS,
        'Rasm faqat JPG, PNG yoki WEBP bo‘lishi mumkin',
      );
      ({ url: imageUrl } = await this.storage.save({
        buffer,
        folder: 'announcements',
        extension: kind,
      }));
    }

    const title = dto.title?.trim() || DEFAULT_ANNOUNCEMENT_TITLE;
    const body = dto.body.trim();
    const announcement = await this.prisma.announcement.create({
      data: {
        title,
        body,
        imageUrl,
        audience: dto.audience,
        recipientCount,
        createdByUserId: senderId,
      },
      select: SELECT,
    });

    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.customer.findMany({
        where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: DISPATCH_CHUNK,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      });
      if (batch.length === 0) break;
      await this.notifications.dispatch(
        batch.map((customer) => ({ customerId: customer.id })),
        {
          type: NotificationType.ANNOUNCEMENT,
          title,
          body,
          imageUrl,
          payload: { announcementId: announcement.id },
        },
      );
      cursor = batch[batch.length - 1].id;
      if (batch.length < DISPATCH_CHUNK) break;
    }

    return announcement;
  }

  /** Yuborilganlar tarixi: admin/moderator — hammasi, qolganlar — o'ziniki. */
  async findAll(
    actor: Actor | undefined,
    query: AnnouncementQueryDto,
  ): Promise<PaginatedResult<AnnouncementDto>> {
    const senderId = this.requireSender(actor);
    const where: Prisma.AnnouncementWhereInput = SEES_ALL_HISTORY.includes(
      actor?.role ?? '',
    )
      ? {}
      : { createdByUserId: senderId };

    const [total, rows] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({
        where,
        select: SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return paginate(rows, total, query);
  }

  // — Ichki —

  private requireSender(actor: Actor | undefined): string {
    if (actor?.type === 'USER' && SENDER_ROLES.includes(actor.role ?? '')) {
      return actor.id;
    }
    throw new ForbiddenException('Xabarni faqat xodim yuboradi');
  }

  /**
   * Yuboruvchi qaysi mijozlarga yoza oladi. Filial qismi — `BranchScopeService`
   * (mijozlar domeni: SUPER_ADMIN va MODERATOR cheklovsiz); menejerga
   * qo'shimcha — faqat o'ziga biriktirilganlar.
   */
  private recipientScope(actor: Actor | undefined): Prisma.CustomerWhereInput {
    const branch = this.branchScope.toPrismaFilter(
      this.branchScope.resolve(actor, undefined, 'CUSTOMERS'),
    );
    return actor?.role === UserRole.MANAGER
      ? { ...branch, managerId: actor.id }
      : branch;
  }
}
