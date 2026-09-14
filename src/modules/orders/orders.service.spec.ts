import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BranchType,
  OrderingType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { CalculatorService } from '../calculator/calculator.service';
import { QuoteService } from '../calculator/quote.service';
import { PricingResolverService } from '../pricing/pricing-resolver.service';
import { CustomerOrderQueryDto, type CreateOrderDto } from './dto';
import { formatOrderNumber } from './order-number';
import { OrdersService } from './orders.service';

/** B-028 · buyurtma yaratish. */
describe('OrdersService (B-028)', () => {
  let service: OrdersService;
  let quotes: { requireCustomer: jest.Mock; build: jest.Mock };
  let tx: {
    orderNumberCounter: { upsert: jest.Mock };
    order: { create: jest.Mock };
  };
  let prisma: {
    productStock: { findMany: jest.Mock };
    customer: { findUniqueOrThrow: jest.Mock };
    order: {
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const actor: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' };
  const calculator = new CalculatorService(new PricingResolverService());

  /** Haqiqiy kalkulyator natijasi — 10 paddon × 1.44 m² × 78 000 (chegirmali). */
  const built = (withTransport = false) => ({
    result: calculator.calculate({
      items: [
        {
          productId: 'p1',
          factoryId: 'f1',
          pallets: 10,
          sqmPerPallet: '1.44',
          weightPerPallet: '32.5',
          basePricePerSqm: '78000',
        },
      ],
      transport: withTransport
        ? {
            branchRegionTariffId: 't1',
            capacityPallets: 20,
            basePricePerVehicle: '12000000',
          }
        : null,
      productRules: [],
      transportRules: [],
    }),
    productNames: new Map([['p1', 'Lyuks Granit Bej']]),
    tariff: null,
  });

  const dto = (over: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
    items: [{ productId: 'p1', pallets: 10 }],
    paymentMethod: PaymentMethod.CASH,
    ...over,
  });

  const createdOrder = {
    id: 'o1',
    orderNumber: 'VK-2026-000007',
    status: OrderStatus.NEW,
    source: OrderSource.WEBSITE,
    totalPallets: 10,
    totalSqm: new Prisma.Decimal('14.4'),
    totalWeightKg: new Prisma.Decimal('325'),
    itemsTotal: new Prisma.Decimal('1123200'),
    deliveryTotal: new Prisma.Decimal('0'),
    grandTotal: new Prisma.Decimal('1123200'),
    transportCount: null,
    exactLat: null,
    exactLng: null,
    note: null,
    createdAt: new Date('2026-09-14'),
    branch: { name: 'Farg‘ona' },
    region: null,
    transportType: null,
    items: [],
    statusHistory: [],
    payments: [
      {
        id: 'pay1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        amount: new Prisma.Decimal('1123200'),
        paidAt: null,
      },
    ],
  };

  beforeEach(async () => {
    quotes = {
      requireCustomer: jest
        .fn()
        .mockResolvedValue({ customerId: 'c1', branchId: 'fargona' }),
      build: jest.fn().mockResolvedValue(built()),
    };
    tx = {
      orderNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ lastValue: 7 }),
      },
      order: { create: jest.fn().mockResolvedValue({ id: 'o1' }) },
    };
    prisma = {
      productStock: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ productId: 'p1', stockPallets: 100 }]),
      },
      customer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          managerId: 'm1',
          branch: { type: BranchType.RETAIL },
        }),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(createdOrder),
        findFirst: jest.fn().mockResolvedValue(createdOrder),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: QuoteService, useValue: quotes },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  const orderData = () =>
    (tx.order.create.mock.calls as [{ data: Record<string, unknown> }][])[0][0]
      .data;

  it('formatOrderNumber — VK-yil-6 xonali', () => {
    expect(formatOrderNumber(2026, 1)).toBe('VK-2026-000001');
    expect(formatOrderNumber(2026, 123456)).toBe('VK-2026-123456');
  });

  describe('🔒 summa faqat backenddan', () => {
    it('kalkulyator bilan bir xil yo‘l: mijoz ID si va tokendagi filial bilan', async () => {
      await service.create(actor, dto());

      expect(quotes.requireCustomer).toHaveBeenCalledWith(actor);
      expect(quotes.build).toHaveBeenCalledWith(
        { branchId: 'fargona', customerId: 'c1' },
        [{ productId: 'p1', pallets: 10 }],
        { regionId: undefined, transportTypeId: undefined },
      );
    });

    it('buyurtma yozuvi: summalar, narx SURATI, filial, manba, holat', async () => {
      await service.create(actor, dto({ note: 'Tezroq' }));
      const data = orderData();

      expect(data).toMatchObject({
        orderNumber: 'VK-2026-000007',
        orderingType: OrderingType.CUSTOMER,
        customerId: 'c1',
        branchId: 'fargona',
        managerId: 'm1',
        source: OrderSource.WEBSITE,
        status: OrderStatus.NEW,
        regionId: null,
        transportTypeId: null,
        transportCount: null,
        totalPallets: 10,
        note: 'Tezroq',
      });
      expect(String(data.itemsTotal)).toBe('1123200');
      expect(String(data.grandTotal)).toBe('1123200');

      const items = (data.items as { create: Record<string, unknown>[] })
        .create;
      expect(String(items[0].pricePerSqmSnapshot)).toBe('78000');
      expect(String(items[0].lineTotal)).toBe('1123200');
      expect(data.statusHistory).toEqual({
        create: { status: OrderStatus.NEW, changedByUserId: null },
      });
      expect(data.isUrgent).toBe(false);
    });

    it('to‘lov yozuvi PENDING, summa = grandTotal, idempotencyKey noyob', async () => {
      await service.create(actor, dto({ paymentMethod: PaymentMethod.CARD }));
      await service.create(actor, dto());

      const payments = (
        tx.order.create.mock.calls as [
          { data: { payments: { create: Record<string, unknown> } } },
        ][]
      ).map((call) => call[0].data.payments.create);

      expect(payments[0]).toMatchObject({
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
      });
      expect(String(payments[0].amount)).toBe('1123200');
      expect(payments[0].idempotencyKey).not.toBe(payments[1].idempotencyKey);
    });

    it('buyurtma raqami yil bo‘yicha hisoblagichdan (atomar upsert)', async () => {
      await service.create(actor, dto());
      const year = new Date().getUTCFullYear();
      expect(tx.orderNumberCounter.upsert).toHaveBeenCalledWith({
        where: { year },
        create: { year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
        select: { lastValue: true },
      });
    });
  });

  describe('yetkazib berish', () => {
    it('transport bilan — viloyat, tur, soni va koordinata saqlanadi', async () => {
      quotes.build.mockResolvedValueOnce(built(true));
      await service.create(
        actor,
        dto({
          regionId: 'toshkent',
          transportTypeId: 'fura',
          exactLat: 41.3,
          exactLng: 69.2,
        }),
      );
      expect(orderData()).toMatchObject({
        regionId: 'toshkent',
        transportTypeId: 'fura',
        transportCount: 1,
        exactLat: 41.3,
        exactLng: 69.2,
      });
      expect(String(orderData().deliveryTotal)).toBe('12000000');
    });

    it.each([
      ['faqat exactLat', { exactLat: 41.3 }],
      ['faqat exactLng', { exactLng: 69.2 }],
      ['olib ketishda koordinata', { exactLat: 41.3, exactLng: 69.2 }],
    ])('%s — 400, hisob ham qilinmaydi', async (_label, over) => {
      await expect(service.create(actor, dto(over))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(quotes.build).not.toHaveBeenCalled();
    });
  });

  describe('🔒 zaxira', () => {
    it.each([
      ['yetmaydi', [{ productId: 'p1', stockPallets: 9 }]],
      ['zaxira yozuvi yo‘q', []],
    ])('%s — 409, buyurtma yaratilmaydi', async (_label, stocks) => {
      prisma.productStock.findMany.mockResolvedValueOnce(stocks);

      await expect(service.create(actor, dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('xato matnida mahsulot nomi bor, lekin ANIQ SON yo‘q (G3)', async () => {
      prisma.productStock.findMany.mockResolvedValueOnce([
        { productId: 'p1', stockPallets: 9 },
      ]);
      const message = await service
        .create(actor, dto())
        .catch((error: Error) => error.message);

      expect(message).toContain('Lyuks Granit Bej');
      expect(message).not.toMatch(/\d/);
    });

    it('aynan teng — o‘tadi', async () => {
      prisma.productStock.findMany.mockResolvedValueOnce([
        { productId: 'p1', stockPallets: 10 },
      ]);
      await expect(service.create(actor, dto())).resolves.toBeDefined();
    });
  });

  it('markaziy omborga biriktirilgan mijoz — AGENT', async () => {
    prisma.customer.findUniqueOrThrow.mockResolvedValueOnce({
      managerId: null,
      branch: { type: BranchType.CENTRAL },
    });
    await service.create(actor, dto());
    expect(orderData()).toMatchObject({
      orderingType: OrderingType.AGENT,
      managerId: null,
    });
  });

  it('javob — mijoz ko‘rinishi, summalar satr', async () => {
    const result = await service.create(actor, dto());
    expect(result).toMatchObject({
      orderNumber: 'VK-2026-000007',
      grandTotal: '1123200',
      delivery: null,
      payments: [{ id: 'pay1', status: 'PENDING', amount: '1123200' }],
    });
  });

  describe('mijoz kabineti (B-031)', () => {
    it('🔒 ro‘yxat faqat tokendagi mijozniki, holat filtri bilan', async () => {
      prisma.order.count.mockResolvedValueOnce(1);
      prisma.order.findMany.mockResolvedValueOnce([
        {
          id: 'o1',
          orderNumber: 'VK-2026-000001',
          status: OrderStatus.NEW,
          totalPallets: 10,
          grandTotal: new Prisma.Decimal('1123200'),
          createdAt: new Date('2026-09-14'),
          updatedAt: new Date('2026-09-14'),
          region: null,
          _count: { items: 2 },
          payments: [{ status: PaymentStatus.PENDING }],
        },
      ]);

      const result = await service.findMine(
        actor,
        Object.assign(new CustomerOrderQueryDto(), {
          status: OrderStatus.NEW,
        }),
      );

      const arg = (
        prisma.order.findMany.mock.calls as [{ where: unknown }][]
      )[0][0];
      expect(arg.where).toEqual({ customerId: 'c1', status: OrderStatus.NEW });
      expect(result.items[0]).toEqual({
        id: 'o1',
        orderNumber: 'VK-2026-000001',
        status: OrderStatus.NEW,
        totalPallets: 10,
        grandTotal: '1123200',
        itemCount: 2,
        regionName: null,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: new Date('2026-09-14'),
        updatedAt: new Date('2026-09-14'),
      });
    });

    it('🔒 IDOR: tafsilot id VA customerId bilan so‘raladi; begonasi — 404', async () => {
      await service.findMineOne(actor, 'o1');
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'o1', customerId: 'c1' } }),
      );

      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(service.findMineOne(actor, 'begona')).rejects.toThrow(
        new NotFoundException('Buyurtma topilmadi'),
      );
    });

    it('🔒 xodim/mehmon — requireCustomer rad etadi', async () => {
      quotes.requireCustomer.mockRejectedValueOnce(new ForbiddenException());
      await expect(
        service.findMine(undefined, new CustomerOrderQueryDto()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.order.findMany).not.toHaveBeenCalled();
    });
  });
});
