import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  BranchType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { AdminOrderQueryDto, AssignOrderManagerDto } from './dto';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersService } from './orders.service';
import { VALIDATION_PIPE_OPTIONS } from '../../common/validation';

/** B-030 · buyurtmalar — admin boshqaruvi. */
describe('OrdersAdminService (B-030)', () => {
  let service: OrdersAdminService;
  let prisma: {
    order: Record<string, jest.Mock>;
    user: { findUnique: jest.Mock };
    customer: { findUnique: jest.Mock };
    branch: { findUnique: jest.Mock };
  };
  let orders: { place: jest.Mock; toCustomerDto: jest.Mock };

  const andijonManager: Actor = {
    id: 'm1',
    type: 'USER',
    role: UserRole.MANAGER,
    branchId: 'andijon',
  };
  const andijonAdmin: Actor = {
    id: 'a1',
    type: 'USER',
    role: UserRole.BRANCH_ADMIN,
    branchId: 'andijon',
  };
  const superAdmin: Actor = {
    id: 's1',
    type: 'USER',
    role: UserRole.SUPER_ADMIN,
    branchId: null,
  };

  const detailRow = (over: Record<string, unknown> = {}) => ({
    id: 'o1',
    branchId: 'andijon',
    status: OrderStatus.NEW,
    transportTypeId: null,
    orderingType: 'CUSTOMER',
    isUrgent: false,
    branch: { id: 'andijon', name: 'Andijon' },
    manager: null,
    guestName: null,
    guestPhone: null,
    customer: {
      id: 'c1',
      companyName: 'Andijon Qurilish',
      contactName: 'Aziz',
      phone: '+998901234567',
    },
    statusHistory: [],
    payments: [
      {
        id: 'p1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        amount: new Prisma.Decimal('100'),
        paidAt: null,
        providerRef: null,
      },
    ],
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      order: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(detailRow()),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn() },
      customer: { findUnique: jest.fn() },
      branch: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
    };
    orders = {
      place: jest.fn().mockResolvedValue('o1'),
      toCustomerDto: jest.fn().mockReturnValue({ id: 'o1' }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersAdminService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: orders },
      ],
    }).compile();

    service = moduleRef.get(OrdersAdminService);
  });

  const query = (over: Partial<AdminOrderQueryDto> = {}) =>
    Object.assign(new AdminOrderQueryDto(), over);
  const listWhere = () =>
    (
      prisma.order.findMany.mock.calls as [{ where: Record<string, unknown> }][]
    )[0][0].where;

  describe('findAll', () => {
    it('🔒 xodim — faqat o‘z filiali (filtrsiz ham)', async () => {
      await service.findAll(andijonManager, query());
      expect(listWhere()).toEqual({ branchId: 'andijon' });
    });

    it('🔒 boshqa filial so‘ralsa — 404', async () => {
      await expect(
        service.findAll(andijonManager, query({ branchId: 'fargona' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('filtrlar Prisma so‘roviga to‘g‘ri tushadi', async () => {
      await service.findAll(
        superAdmin,
        query({
          status: OrderStatus.NEW,
          source: OrderSource.PHONE,
          isUrgent: false,
          paymentStatus: PaymentStatus.PAID,
          managerId: 'm1',
          dateFrom: '2026-09-01',
          dateTo: '2026-10-01',
          search: 'vk-2026',
        }),
      );
      const where = listWhere();
      expect(where).toMatchObject({
        status: OrderStatus.NEW,
        source: OrderSource.PHONE,
        isUrgent: false,
        managerId: 'm1',
        payments: { some: { status: PaymentStatus.PAID } },
        createdAt: {
          gte: new Date('2026-09-01'),
          lt: new Date('2026-10-01'),
        },
      });
      expect(where).not.toHaveProperty('branchId');
      expect((where.OR as unknown[]).length).toBe(6);
    });

    it('dateFrom ≥ dateTo — 400', async () => {
      await expect(
        service.findAll(
          superAdmin,
          query({ dateFrom: '2026-10-01', dateTo: '2026-09-01' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('xaridor va oxirgi to‘lov holati', async () => {
      prisma.order.count.mockResolvedValueOnce(2);
      prisma.order.findMany.mockResolvedValueOnce([
        {
          id: 'o1',
          grandTotal: new Prisma.Decimal('100'),
          guestName: 'Aziz aka',
          guestPhone: '+998935554433',
          customer: null,
          payments: [{ status: PaymentStatus.PAID }],
        },
        {
          id: 'o2',
          grandTotal: new Prisma.Decimal('200'),
          guestName: null,
          guestPhone: null,
          customer: null,
          payments: [],
        },
      ]);
      const result = await service.findAll(superAdmin, query());
      expect(result.items[0]).toMatchObject({
        grandTotal: '100',
        buyer: { customerId: null, name: 'Aziz aka', phone: '+998935554433' },
        paymentStatus: PaymentStatus.PAID,
      });
      expect(result.items[1]).toMatchObject({
        buyer: null,
        paymentStatus: null,
      });
    });
  });

  describe('findOne / setUrgent', () => {
    it('🔒 boshqa filial buyurtmasi — 404, o‘zgartirilmaydi', async () => {
      prisma.order.findUnique.mockResolvedValue({ branchId: 'fargona' });
      await expect(
        service.setUrgent(andijonManager, 'o1', true),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('admin ko‘rinishi: xaridor, to‘lov providerRef, ruxsat etilgan holatlar', async () => {
      const result = await service.findOne(andijonManager, 'o1');
      expect(result).toMatchObject({
        buyer: { customerId: 'c1', name: 'Andijon Qurilish' },
        payments: [{ id: 'p1', amount: '100', providerRef: null }],
        allowedNextStatuses: [OrderStatus.LOADING, OrderStatus.CANCELLED],
      });
    });
  });

  describe('assign', () => {
    beforeEach(() => {
      prisma.order.findUnique.mockResolvedValue(detailRow());
    });

    it('o‘z filialining faol menejeri — biriktiriladi', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
        role: UserRole.MANAGER,
        isActive: true,
      });
      await service.assign(andijonAdmin, 'o1', 'm2');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { managerId: 'm2' },
      });
    });

    it.each([
      [
        'boshqa filial xodimi',
        { branchId: 'fargona', role: UserRole.MANAGER, isActive: true },
      ],
      [
        'faol emas',
        { branchId: 'andijon', role: UserRole.MANAGER, isActive: false },
      ],
      [
        'SUPER_ADMIN (filialsiz)',
        { branchId: null, role: UserRole.SUPER_ADMIN, isActive: true },
      ],
      ['topilmadi', null],
    ])('%s — 400', async (_label, staff) => {
      prisma.user.findUnique.mockResolvedValueOnce(staff);
      await expect(
        service.assign(andijonAdmin, 'o1', 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('null — biriktirish olib tashlanadi, xodim tekshirilmaydi', async () => {
      await service.assign(andijonAdmin, 'o1', null);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { managerId: null },
      });
    });

    it('DTO: managerId maydoni yo‘q — 400, null — o‘tadi', async () => {
      const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
      const run = (value: object) =>
        pipe.transform(value, {
          type: 'body',
          metatype: AssignOrderManagerDto,
        });

      await expect(run({})).rejects.toBeInstanceOf(BadRequestException);
      await expect(run({ managerId: null })).resolves.toEqual({
        managerId: null,
      });
    });
  });

  describe('createManual', () => {
    const draft = {
      items: [{ productId: 'p1', pallets: 1 }],
      paymentMethod: PaymentMethod.CASH,
      source: OrderSource.PHONE,
    } as const;

    const placed = () =>
      (orders.place.mock.calls as [Record<string, unknown>][])[0][0];

    it('mijoz uchun: mijoz filiali, agent belgisi, kiritgan menejer biriktiriladi', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
        isActive: true,
        managerId: 'other',
        branch: { type: BranchType.RETAIL },
      });

      await service.createManual(andijonManager, {
        ...draft,
        customerId: 'c1',
        isUrgent: true,
      });

      expect(placed()).toMatchObject({
        branchId: 'andijon',
        buyer: { customerId: 'c1', isAgent: false },
        managerId: 'm1',
        source: OrderSource.PHONE,
        isUrgent: true,
        createdByUserId: 'm1',
      });
    });

    it('filial admini kiritsa — mijozning o‘z menejeri qoladi', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
        isActive: true,
        managerId: 'own',
        branch: { type: BranchType.CENTRAL },
      });
      await service.createManual(andijonAdmin, { ...draft, customerId: 'c1' });
      expect(placed()).toMatchObject({
        managerId: 'own',
        buyer: { customerId: 'c1', isAgent: true },
      });
    });

    it('🔒 boshqa filial mijozi — 404, buyurtma yozilmaydi', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({
        branchId: 'fargona',
        isActive: true,
        managerId: null,
        branch: { type: BranchType.RETAIL },
      });
      await expect(
        service.createManual(andijonManager, { ...draft, customerId: 'c9' }),
      ).rejects.toThrow(new NotFoundException('Mijoz topilmadi'));
      expect(orders.place).not.toHaveBeenCalled();
    });

    it('faol bo‘lmagan mijoz — 400', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
        isActive: false,
        managerId: null,
        branch: { type: BranchType.RETAIL },
      });
      await expect(
        service.createManual(andijonManager, { ...draft, customerId: 'c1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hisobsiz xaridor: xodim filiali (so‘rovdagi branchId e’tiborsiz emas — mos kelmasa 404)', async () => {
      await service.createManual(andijonManager, {
        ...draft,
        guestName: 'Aziz aka',
        guestPhone: '+998935554433',
      });
      expect(placed()).toMatchObject({
        branchId: 'andijon',
        buyer: { guestName: 'Aziz aka', guestPhone: '+998935554433' },
        managerId: 'm1',
      });

      await expect(
        service.createManual(andijonManager, {
          ...draft,
          guestName: 'A',
          guestPhone: '+998935554433',
          branchId: 'fargona',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hisobsiz xaridor, SUPER_ADMIN — filial majburiy (400)', async () => {
      await expect(
        service.createManual(superAdmin, {
          ...draft,
          guestName: 'A',
          guestPhone: '+998935554433',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['xaridor yo‘q', {}],
      ['faqat guestName', { guestName: 'A' }],
      [
        'ikkalasi ham',
        { customerId: 'c1', guestName: 'A', guestPhone: '+998935554433' },
      ],
    ])('%s — 400', async (_label, over) => {
      await expect(
        service.createManual(andijonManager, { ...draft, ...over }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orders.place).not.toHaveBeenCalled();
    });
  });
});
