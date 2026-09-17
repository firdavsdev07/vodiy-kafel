import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { BranchType, UserRole, type OrderStatus } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type {
  AdminOrderDetailDto,
  AdminOrderListItemDto,
  AdminOrderQueryDto,
  AssignableStaffDto,
  CreateManualOrderDto,
  OrderBuyerDto,
} from './dto';
import { allowedNextStatuses } from './order-status';
import {
  ORDER_SELECT,
  OrdersService,
  type PlaceOrderInput,
} from './orders.service';

const ORDER_NOT_FOUND = 'Buyurtma topilmadi';
const CUSTOMER_NOT_FOUND = 'Mijoz topilmadi';

const BUYER_SELECT = {
  guestName: true,
  guestPhone: true,
  customer: {
    select: { id: true, companyName: true, contactName: true, phone: true },
  },
} as const;

const ADMIN_DETAIL_SELECT = {
  ...ORDER_SELECT,
  ...BUYER_SELECT,
  orderingType: true,
  isUrgent: true,
  transportTypeId: true,
  branchId: true,
  branch: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: {
      status: true,
      note: true,
      createdAt: true,
      changedBy: { select: { id: true, fullName: true } },
    },
  },
  payments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      paidAt: true,
      providerRef: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

const LIST_SELECT = {
  ...BUYER_SELECT,
  id: true,
  orderNumber: true,
  status: true,
  source: true,
  orderingType: true,
  isUrgent: true,
  totalPallets: true,
  grandTotal: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true } },
  payments: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { status: true },
  },
} as const satisfies Prisma.OrderSelect;

type BuyerRow = Prisma.OrderGetPayload<{ select: typeof BUYER_SELECT }>;

/**
 * Buyurtmani qabul qila oladigan xodim rollari (biriktirish uchun).
 *
 * ⚠ YAGONA MANBA: `assign()` ham, nomzodlar ro'yxati (`assignableStaff`,
 *   B-062) ham shu ro'yxatdan o'qiydi. Ikki joyda yozilsa, ro'yxatda
 *   ko'rinadigan-u biriktirishda 400 beradigan xodim paydo bo'lardi.
 */
const ASSIGNABLE_ROLES = [
  UserRole.MANAGER,
  UserRole.BRANCH_ADMIN,
  UserRole.MODERATOR,
] as const satisfies readonly UserRole[];

/**
 * Buyurtmalar — admin boshqaruvi (B-030).
 *
 * 🔒 Har bir o'qish va yozish `BranchScopeService` orqali (B-051): xodim
 *    faqat o'z filiali buyurtmalarini ko'radi, begonasi — 404.
 */
@Injectable()
export class OrdersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly orders: OrdersService,
  ) {}

  async findAll(
    actor: Actor | undefined,
    query: AdminOrderQueryDto,
  ): Promise<PaginatedResult<AdminOrderListItemDto>> {
    const scope = this.branchScope.resolve(actor, query.branchId);
    const where: Prisma.OrderWhereInput = {
      ...this.branchScope.toPrismaFilter(scope),
      ...this.buildFilters(query),
    };

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map(({ payments, guestName, guestPhone, customer, ...row }) => ({
        ...row,
        grandTotal: row.grandTotal.toString(),
        buyer: this.toBuyer({ guestName, guestPhone, customer }),
        paymentStatus: payments[0]?.status ?? null,
      })),
      total,
      query,
    );
  }

  async findOne(
    actor: Actor | undefined,
    orderId: string,
  ): Promise<AdminOrderDetailDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: ADMIN_DETAIL_SELECT,
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      order.branchId ?? '',
      ORDER_NOT_FOUND,
    );

    const base = this.orders.toCustomerDto(order);
    return {
      ...base,
      orderingType: order.orderingType,
      isUrgent: order.isUrgent,
      branch: order.branch,
      buyer: this.toBuyer(order),
      manager: order.manager,
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toString(),
      })),
      statusHistory: order.statusHistory,
      allowedNextStatuses: [
        ...allowedNextStatuses(order.status, order.transportTypeId !== null),
      ] as OrderStatus[],
    };
  }

  async setUrgent(
    actor: Actor | undefined,
    orderId: string,
    isUrgent: boolean,
  ): Promise<AdminOrderDetailDto> {
    await this.requireOrderBranch(actor, orderId);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { isUrgent },
    });
    return this.findOne(actor, orderId);
  }

  /**
   * Menejer biriktirish. 🔒 Xodim buyurtma FILIALIGA tegishli va faol
   * bo'lishi shart — Andijon buyurtmasi Farg'ona menejeriga biriktirilsa,
   * u o'z panelida uni umuman ko'rolmasdi.
   */
  async assign(
    actor: Actor | undefined,
    orderId: string,
    managerId: string | null,
  ): Promise<AdminOrderDetailDto> {
    const branchId = await this.requireOrderBranch(actor, orderId);

    if (managerId !== null) {
      const staff = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { branchId: true, role: true, isActive: true },
      });
      if (
        !staff?.isActive ||
        staff.branchId !== branchId ||
        !ASSIGNABLE_ROLES.includes(
          staff.role as (typeof ASSIGNABLE_ROLES)[number],
        )
      ) {
        throw new BadRequestException(
          'Xodim topilmadi, faol emas yoki bu filialga tegishli emas',
        );
      }
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { managerId },
    });
    return this.findOne(actor, orderId);
  }

  /**
   * Buyurtmaga biriktirish uchun nomzod xodimlar (B-062).
   *
   * ⚠ NEGA KERAK EDI: `GET /admin/managers` faqat SUPER_ADMIN va
   *   BRANCH_ADMIN uchun ochiq va faqat MANAGER rolini qaytaradi. Ya'ni
   *   MODERATOR markaziy ombor buyurtmasini boshqa xodimga biriktira
   *   olmasdi (faqat o'ziga), BRANCH_ADMIN ni esa hech kim ro'yxatdan
   *   tanlay olmasdi — biriktirish qabul qiladigan rollar ro'yxati
   *   bilan mos kelmasdi.
   *
   * 🔒 Ro'yxat BUYURTMA filialiga bog'langan (so'rovdagi `branchId` ga
   *    emas): begona filial buyurtmasi so'ralsa 404 (`requireOrderBranch`).
   *    Shu sababli xodim boshqa filialning xodimlar ro'yxatini bu
   *    endpoint orqali ham ko'rib olmaydi.
   *
   * ⚠ Faqat FAOL xodimlar: faolsizlantirilgan xodimga biriktirish
   *   `assign()` da 400 beradi, demak uni ro'yxatda ko'rsatish xato.
   */
  async assignableStaff(
    actor: Actor | undefined,
    orderId: string,
  ): Promise<AssignableStaffDto[]> {
    const branchId = await this.requireOrderBranch(actor, orderId);
    // Filialsiz buyurtma (mehmon, filial biriktirilmagan) — nomzod yo'q
    if (!branchId) return [];

    const rows = await this.prisma.user.findMany({
      where: {
        branchId,
        isActive: true,
        role: { in: [...ASSIGNABLE_ROLES] },
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        telegramUsername: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      role: row.role,
      telegramUsername: row.telegramUsername,
    }));
  }

  /**
   * Telefon/Telegram orqali kelgan buyurtmani qo'lda kiritish.
   *
   * 🔒 Narx va zaxira — mijoz buyurtmasi bilan AYNAN bir yo'l
   *    (`OrdersService.place`). Filial: mijozda — mijozniki; hisobsiz
   *    xaridorda — xodimniki (SUPER_ADMIN aniq ko'rsatadi).
   */
  async createManual(
    actor: Actor | undefined,
    dto: CreateManualOrderDto,
  ): Promise<AdminOrderDetailDto> {
    const hasGuest = Boolean(dto.guestName || dto.guestPhone);
    if (dto.customerId && hasGuest) {
      throw new BadRequestException(
        'customerId yoki guestName/guestPhone — faqat bittasi',
      );
    }

    const actingManager =
      actor?.type === 'USER' && actor.role === UserRole.MANAGER
        ? actor.id
        : null;

    let branchId: string;
    let buyer: PlaceOrderInput['buyer'];
    let managerId: string | null;

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: {
          branchId: true,
          isActive: true,
          managerId: true,
          branch: { select: { type: true } },
        },
      });
      if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
      this.branchScope.assertWithinScope(
        actor,
        customer.branchId,
        CUSTOMER_NOT_FOUND,
      );
      if (!customer.isActive) {
        throw new BadRequestException('Mijoz hisobi faol emas');
      }
      if (dto.branchId && dto.branchId !== customer.branchId) {
        throw new BadRequestException(
          'Mijoz buyurtmasi faqat mijoz biriktirilgan filialga yoziladi',
        );
      }

      branchId = customer.branchId;
      buyer = {
        customerId: dto.customerId,
        isAgent: customer.branch.type === BranchType.CENTRAL,
      };
      managerId = actingManager ?? customer.managerId;
    } else {
      const { guestName, guestPhone } = dto;
      if (!guestName || !guestPhone) {
        throw new BadRequestException(
          'Xaridor kerak: customerId yoki guestName + guestPhone',
        );
      }
      branchId = this.branchScope.requireBranchId(actor, dto.branchId);
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { isActive: true },
      });
      if (!branch?.isActive) throw new NotFoundException('Filial topilmadi');

      buyer = { guestName, guestPhone };
      managerId = actingManager;
    }

    const orderId = await this.orders.place({
      branchId,
      buyer,
      managerId,
      source: dto.source,
      isUrgent: dto.isUrgent ?? false,
      createdByUserId: actor?.type === 'USER' ? actor.id : null,
      draft: dto,
    });

    return this.findOne(actor, orderId);
  }

  /** Buyurtma filiali — doira tekshiruvi bilan. */
  private async requireOrderBranch(
    actor: Actor | undefined,
    orderId: string,
  ): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { branchId: true },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      order.branchId ?? '',
      ORDER_NOT_FOUND,
    );
    return order.branchId;
  }

  private buildFilters(query: AdminOrderQueryDto): Prisma.OrderWhereInput {
    const from = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const to = query.dateTo ? new Date(query.dateTo) : undefined;
    if (from && to && from >= to) {
      throw new BadRequestException('dateFrom dateTo dan oldin bo‘lishi kerak');
    }

    const contains = (value: string) => ({
      contains: value,
      mode: 'insensitive' as const,
    });

    return {
      ...(query.status && { status: query.status }),
      ...(query.source && { source: query.source }),
      ...(query.isUrgent !== undefined && { isUrgent: query.isUrgent }),
      ...(query.managerId && { managerId: query.managerId }),
      ...(query.paymentStatus && {
        payments: { some: { status: query.paymentStatus } },
      }),
      ...((from || to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lt: to }) },
      }),
      ...(query.search && {
        OR: [
          { orderNumber: contains(query.search) },
          { guestName: contains(query.search) },
          { guestPhone: contains(query.search) },
          { customer: { companyName: contains(query.search) } },
          { customer: { contactName: contains(query.search) } },
          { customer: { phone: contains(query.search) } },
        ],
      }),
    };
  }

  private toBuyer(row: BuyerRow): OrderBuyerDto | null {
    if (row.customer) {
      return {
        customerId: row.customer.id,
        name: row.customer.companyName,
        contactName: row.customer.contactName,
        phone: row.customer.phone,
      };
    }
    if (row.guestName || row.guestPhone) {
      return {
        customerId: null,
        name: row.guestName ?? '',
        contactName: null,
        phone: row.guestPhone,
      };
    }
    return null;
  }
}
