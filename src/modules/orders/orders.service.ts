import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  OrderingType,
  OrderSource,
  OrderStatus,
  PaymentStatus,
} from '../../common/enums';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import type {
  CreateOrderDto,
  CustomerOrderListItemDto,
  CustomerOrderQueryDto,
  OrderCustomerResponseDto,
} from './dto';
import { formatOrderNumber } from './order-number';

export const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  source: true,
  totalPallets: true,
  totalSqm: true,
  totalWeightKg: true,
  itemsTotal: true,
  deliveryTotal: true,
  grandTotal: true,
  transportCount: true,
  exactLat: true,
  exactLng: true,
  note: true,
  createdAt: true,
  branch: { select: { name: true } },
  region: { select: { name: true } },
  transportType: { select: { name: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      productId: true,
      pallets: true,
      sqm: true,
      weightKg: true,
      pricePerSqmSnapshot: true,
      lineTotal: true,
      product: { select: { name: true, slug: true } },
    },
  },
  // 🔒 `changedByUserId` ataylab tanlanmaydi — mijozga xodim ID si kerak emas.
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: { status: true, note: true, createdAt: true },
  },
  payments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      paidAt: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

export type OrderCustomerRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_SELECT;
}>;

/** Buyurtma tarkibi — mijoz ham, menejer ham shu shaklda yuboradi. */
export type OrderDraft = Pick<
  CreateOrderDto,
  | 'items'
  | 'regionId'
  | 'transportTypeId'
  | 'exactLat'
  | 'exactLng'
  | 'paymentMethod'
  | 'note'
>;

export interface PlaceOrderInput {
  /** Buyurtmani bajaradigan filial — narx va tarif shu filialdan. */
  branchId: string;
  buyer:
    | { customerId: string; isAgent: boolean }
    | { guestName: string; guestPhone: string };
  managerId: string | null;
  source: OrderSource;
  isUrgent: boolean;
  /** Qo'lda kiritgan xodim — tarixdagi NEW yozuvi uchun. */
  createdByUserId: string | null;
  draft: OrderDraft;
}

/**
 * Buyurtmalar (B-028, TZ 3.4).
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuoteService,
  ) {}

  /**
   * Optom mijoz buyurtmasi.
   *
   * 🔒 Summa kalkulyator bilan AYNAN bir yo'ldan (`QuoteService.build`):
   *    filial narxi (tokendan) → mijoz qoidalari → hisob. Frontend yuborgan
   *    hech qanday son ishlatilmaydi.
   *
   * ⚠ Bildirishnoma va menejerga `sendLocation` — B-037 (event tizimi)
   *   bilan ulanadi; hozircha kanal yo'q.
   */
  async create(
    actor: Actor | undefined,
    dto: CreateOrderDto,
  ): Promise<OrderCustomerResponseDto> {
    const customer = await this.quotes.requireCustomer(actor);

    const orderId = await this.place({
      branchId: customer.branchId,
      buyer: { customerId: customer.customerId, isAgent: customer.isAgent },
      managerId: customer.managerId,
      source: OrderSource.WEBSITE,
      isUrgent: false,
      createdByUserId: null,
      draft: dto,
    });

    return this.toCustomerDto(
      await this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: ORDER_SELECT,
      }),
    );
  }

  /**
   * Buyurtmani yozadi — mijoz ham (B-028), menejer qo'lda kiritgani ham
   * (B-030) SHU yo'ldan o'tadi: hisob, zaxira, raqam, tranzaksiya bir xil.
   *
   * @returns yaratilgan buyurtma ID si
   */
  async place(input: PlaceOrderInput): Promise<string> {
    const { draft } = input;
    const hasDelivery = Boolean(draft.regionId && draft.transportTypeId);
    this.assertLocation(draft, hasDelivery);

    const customerId =
      'customerId' in input.buyer ? input.buyer.customerId : null;
    const { result, productNames } = await this.quotes.build(
      { branchId: input.branchId, customerId },
      draft.items,
      { regionId: draft.regionId, transportTypeId: draft.transportTypeId },
    );

    const stocks = await this.prisma.productStock.findMany({
      where: { productId: { in: result.items.map((item) => item.productId) } },
      select: { productId: true, stockPallets: true },
    });

    // 🔒 Qancha yetmasligi AYTILMAYDI — aniq zaxira soni sir (G3).
    const available = new Map(stocks.map((s) => [s.productId, s.stockPallets]));
    const short = result.items.filter(
      (item) => (available.get(item.productId) ?? 0) < item.pallets,
    );
    if (short.length > 0) {
      throw new ConflictException(
        `Omborda yetarli emas: ${short
          .map((item) => productNames.get(item.productId))
          .join(', ')}`,
      );
    }

    const buyerData =
      'customerId' in input.buyer
        ? {
            customerId: input.buyer.customerId,
            // Markaziy omborga biriktirilgan mijoz — B2B agent (TZ 3.7.2).
            orderingType: input.buyer.isAgent
              ? OrderingType.AGENT
              : OrderingType.CUSTOMER,
          }
        : {
            guestName: input.buyer.guestName,
            guestPhone: input.buyer.guestPhone,
            orderingType: OrderingType.CUSTOMER,
          };

    const year = new Date().getUTCFullYear();

    const order = await this.prisma.$transaction(async (tx) => {
      // INSERT ... ON CONFLICT DO UPDATE — parallel buyurtmalar bir xil
      // raqam ololmaydi (OrderNumberCounter izohiga qara).
      const counter = await tx.orderNumberCounter.upsert({
        where: { year },
        create: { year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
        select: { lastValue: true },
      });

      return tx.order.create({
        data: {
          orderNumber: formatOrderNumber(year, counter.lastValue),
          ...buyerData,
          branchId: input.branchId,
          managerId: input.managerId,
          source: input.source,
          status: OrderStatus.NEW,
          isUrgent: input.isUrgent,
          itemsTotal: result.itemsTotal,
          deliveryTotal: result.deliveryTotal,
          grandTotal: result.grandTotal,
          regionId: hasDelivery ? draft.regionId : null,
          transportTypeId: hasDelivery ? draft.transportTypeId : null,
          transportCount: result.transport?.vehicleCount ?? null,
          exactLat: draft.exactLat ?? null,
          exactLng: draft.exactLng ?? null,
          totalPallets: result.totalPallets,
          totalSqm: result.totalSqm,
          totalWeightKg: result.totalWeightKg,
          note: draft.note ?? null,
          items: {
            create: result.items.map((item) => ({
              productId: item.productId,
              pallets: item.pallets,
              sqm: item.sqm,
              weightKg: item.weightKg,
              pricePerSqmSnapshot: item.pricePerSqm,
              lineTotal: item.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              status: OrderStatus.NEW,
              changedByUserId: input.createdByUserId,
            },
          },
          payments: {
            create: {
              method: draft.paymentMethod,
              amount: result.grandTotal,
              status: PaymentStatus.PENDING,
              idempotencyKey: randomUUID(),
            },
          },
        },
        select: { id: true },
      });
    });

    return order.id;
  }

  /**
   * Mijoz kabineti — o'z buyurtmalari tarixi (B-031).
   *
   * 🔒 Filtr `customerId` bo'yicha — tokendan. Mijoz boshqa filialga
   *    o'tkazilgan bo'lsa ham o'z eski buyurtmalarini ko'radi.
   */
  async findMine(
    actor: Actor | undefined,
    query: CustomerOrderQueryDto,
  ): Promise<PaginatedResult<CustomerOrderListItemDto>> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(query.status && { status: query.status }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPallets: true,
          grandTotal: true,
          createdAt: true,
          updatedAt: true,
          region: { select: { name: true } },
          _count: { select: { items: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map(({ region, _count, payments, grandTotal, ...row }) => ({
        ...row,
        grandTotal: grandTotal.toString(),
        itemCount: _count.items,
        regionName: region?.name ?? null,
        paymentStatus: payments[0]?.status ?? null,
      })),
      total,
      query,
    );
  }

  /**
   * 🔒 IDOR himoyasi (CLAUDE.md qoida 6): so'rov `id` VA `customerId` bilan —
   *    begona buyurtma bazadan umuman olinmaydi va javob "topilmadi" bilan
   *    bir xil (403 emas — mavjudligi oshkor qilinmaydi).
   */
  async findMineOne(
    actor: Actor | undefined,
    orderId: string,
  ): Promise<OrderCustomerResponseDto> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: ORDER_SELECT,
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return this.toCustomerDto(order);
  }

  toCustomerDto(order: OrderCustomerRow): OrderCustomerResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      branchName: order.branch?.name ?? '',
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        pallets: item.pallets,
        sqm: item.sqm.toString(),
        weightKg: item.weightKg.toString(),
        pricePerSqm: item.pricePerSqmSnapshot.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      totalPallets: order.totalPallets,
      totalSqm: order.totalSqm.toString(),
      totalWeightKg: order.totalWeightKg.toString(),
      itemsTotal: order.itemsTotal.toString(),
      deliveryTotal: order.deliveryTotal.toString(),
      grandTotal: order.grandTotal.toString(),
      delivery:
        order.region && order.transportType && order.transportCount
          ? {
              regionName: order.region.name,
              transportTypeName: order.transportType.name,
              vehicleCount: order.transportCount,
              exactLat: order.exactLat,
              exactLng: order.exactLng,
            }
          : null,
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toString(),
      })),
      statusHistory: order.statusHistory,
      note: order.note,
      createdAt: order.createdAt,
    };
  }

  /** Aniq nuqta: ikkala koordinata birga va faqat yetkazib berishda. */
  private assertLocation(dto: OrderDraft, hasDelivery: boolean): void {
    const hasLat = dto.exactLat !== undefined;
    const hasLng = dto.exactLng !== undefined;

    if (hasLat !== hasLng) {
      throw new BadRequestException(
        'exactLat va exactLng birga yuborilishi kerak',
      );
    }
    if (hasLat && !hasDelivery) {
      throw new BadRequestException(
        'Aniq manzil faqat yetkazib berishda ko‘rsatiladi (olib ketishda emas)',
      );
    }
  }
}
