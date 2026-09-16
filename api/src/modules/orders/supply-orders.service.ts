import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import {
  BranchType,
  OrderingType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import type {
  ChangeOrderStatusDto,
  CreateSupplyOrderDto,
  OrderStatusChangeResponseDto,
  SupplyOrderListItemDto,
  SupplyOrderQueryDto,
  SupplyOrderResponseDto,
} from './dto';
import { allowedNextStatuses } from './order-status';
import { OrderStatusService } from './order-status.service';
import { ORDER_SELECT, OrdersService } from './orders.service';

const SUPPLY_ORDER_NOT_FOUND = 'Ta’minot buyurtmasi topilmadi';

const DETAIL_SELECT = {
  ...ORDER_SELECT,
  transportTypeId: true,
  orderingBranch: { select: { id: true, name: true } },
} as const;

const LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  totalPallets: true,
  grandTotal: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
  orderingBranch: { select: { id: true, name: true } },
  payments: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { status: true },
  },
} as const;

type ListRow = Prisma.OrderGetPayload<{ select: typeof LIST_SELECT }>;

/**
 * Filial → markaziy ombor ta'minot buyurtmasi (B-058, TZ 3.7.2).
 * Qaror hujjati: docs/adr/0001-branch-supply-orders.md.
 *
 * Mijoz buyurtmasi bilan AYNAN bitta yo'l (`OrdersService.place`): narx,
 * zaxira, raqam, tranzaksiya, hodisa. Farqi — xaridor:
 *   `branchId`         = markaziy ombor (bajaruvchi, moderator ko'radi)
 *   `orderingType`     = BRANCH
 *   `orderingBranchId` = buyurtma bergan do'kon
 *
 * 🔒 Narx — markaziy omborning `BranchProduct` narxi (ta'minot narxi) va
 *    markaz tariflari; individual mijoz qoidalari qo'llanmaydi. Filial
 *    tokendan; boshqa do'kon nomidan buyurtma berib bo'lmaydi.
 * 🔒 Do'kon o'z ta'minot buyurtmalarini ko'radi (`orderingBranchId` bo'yicha),
 *    markaz — o'ziga kelganlarini (`branchId` bo'yicha, B-051).
 */
@Injectable()
export class SupplyOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly orderStatus: OrderStatusService,
    private readonly branchScope: BranchScopeService,
  ) {}

  async create(
    actor: Actor | undefined,
    dto: CreateSupplyOrderDto,
  ): Promise<SupplyOrderResponseDto> {
    const orderingBranchId = await this.requireRetailBranch(actor);
    const centralBranchId = await this.resolveCentral(dto.centralBranchId);

    const orderId = await this.orders.place({
      branchId: centralBranchId,
      buyer: { orderingBranchId },
      managerId: null,
      source: OrderSource.ADMIN,
      isUrgent: false,
      createdByUserId: actor!.id,
      draft: {
        items: dto.items,
        regionId: dto.regionId,
        transportTypeId: dto.transportTypeId,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        note: dto.note,
      },
    });
    return this.findOne(orderId, { orderingBranchId });
  }

  /** Do'kon — o'z ta'minot buyurtmalari. */
  async findMine(
    actor: Actor | undefined,
    query: SupplyOrderQueryDto,
  ): Promise<PaginatedResult<SupplyOrderListItemDto>> {
    const orderingBranchId = await this.requireRetailBranch(actor);
    return this.list({ orderingBranchId }, query);
  }

  async findMineOne(
    actor: Actor | undefined,
    id: string,
  ): Promise<SupplyOrderResponseDto> {
    const orderingBranchId = await this.requireRetailBranch(actor);
    return this.findOne(id, { orderingBranchId });
  }

  /** Markaz — o'ziga kelgan ta'minot buyurtmalari (moderator: o'z ombori). */
  findForCentral(
    actor: Actor | undefined,
    query: SupplyOrderQueryDto,
  ): Promise<PaginatedResult<SupplyOrderListItemDto>> {
    const scope = this.branchScope.resolve(actor);
    return this.list(
      {
        ...this.branchScope.toPrismaFilter(scope),
        ...(query.orderingBranchId && {
          orderingBranchId: query.orderingBranchId,
        }),
      },
      query,
    );
  }

  async findOneForCentral(
    actor: Actor | undefined,
    id: string,
  ): Promise<SupplyOrderResponseDto> {
    const scope = this.branchScope.resolve(actor);
    return this.findOne(id, this.branchScope.toPrismaFilter(scope));
  }

  /**
   * Holat — B-029 matritsasi va qulfi. Faqat ta'minot buyurtmasi: mijoz
   * buyurtmasi ID si bu yo'lda "topilmadi".
   */
  async changeStatus(
    actor: Actor | undefined,
    id: string,
    dto: ChangeOrderStatusDto,
  ): Promise<OrderStatusChangeResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id, orderingType: OrderingType.BRANCH },
      select: { id: true },
    });
    if (!order) throw new NotFoundException(SUPPLY_ORDER_NOT_FOUND);
    return this.orderStatus.change(actor, id, dto);
  }

  // — Ichki —

  /** 🔒 Faqat do'kon (RETAIL) filiali xodimi; filial — tokendan. */
  private async requireRetailBranch(actor: Actor | undefined): Promise<string> {
    if (
      actor?.type !== 'USER' ||
      (actor.role !== UserRole.BRANCH_ADMIN && actor.role !== UserRole.MANAGER)
    ) {
      throw new ForbiddenException(
        'Ta’minot buyurtmasini do‘kon filiali xodimi beradi',
      );
    }
    const branchId = this.branchScope.requireBranchId(actor);
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { type: true, isActive: true },
    });
    if (!branch?.isActive || branch.type !== BranchType.RETAIL) {
      throw new ForbiddenException(
        'Ta’minot buyurtmasini faqat faol do‘kon filiali beradi',
      );
    }
    return branchId;
  }

  private async resolveCentral(requested?: string): Promise<string> {
    const centrals = await this.prisma.branch.findMany({
      where: {
        type: BranchType.CENTRAL,
        isActive: true,
        ...(requested && { id: requested }),
      },
      select: { id: true },
    });
    if (requested) {
      if (centrals.length === 0) {
        throw new BadRequestException('Markaziy ombor topilmadi yoki yopiq');
      }
      return centrals[0].id;
    }
    if (centrals.length === 0) {
      throw new BadRequestException('Faol markaziy ombor yo‘q');
    }
    if (centrals.length > 1) {
      throw new BadRequestException(
        'Markaziy omborlar bir nechta — centralBranchId ni ko‘rsating',
      );
    }
    return centrals[0].id;
  }

  private async findOne(
    id: string,
    where: Prisma.OrderWhereInput,
  ): Promise<SupplyOrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id, orderingType: OrderingType.BRANCH, ...where },
      select: DETAIL_SELECT,
    });
    if (!order?.orderingBranch) {
      throw new NotFoundException(SUPPLY_ORDER_NOT_FOUND);
    }
    return {
      ...this.orders.toCustomerDto(order),
      orderingBranch: order.orderingBranch,
      allowedNextStatuses: [
        ...allowedNextStatuses(order.status, order.transportTypeId !== null),
      ] as OrderStatus[],
    };
  }

  private async list(
    where: Prisma.OrderWhereInput,
    query: SupplyOrderQueryDto,
  ): Promise<PaginatedResult<SupplyOrderListItemDto>> {
    const fullWhere: Prisma.OrderWhereInput = {
      orderingType: OrderingType.BRANCH,
      ...where,
      ...(query.status && { status: query.status }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where: fullWhere }),
      this.prisma.order.findMany({
        where: fullWhere,
        select: LIST_SELECT,
        orderBy: [{ createdAt: query.sortOrder }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return paginate(rows.map(toListItem), total, query);
  }
}

function toListItem(row: ListRow): SupplyOrderListItemDto {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    orderingBranch: row.orderingBranch!,
    centralBranch: row.branch!,
    totalPallets: row.totalPallets,
    grandTotal: row.grandTotal.toString(),
    paymentStatus: row.payments[0]?.status ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
