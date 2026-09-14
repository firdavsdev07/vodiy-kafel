import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { OrderStatus, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import { allowedNextStatuses, canTransition } from './order-status';
import { OrderStatusService, phoneKey } from './order-status.service';

const S = OrderStatus;

describe('Buyurtma holati matritsasi (B-029)', () => {
  const all = Object.values(OrderStatus);

  /** Har bir (from, to) juftligi — faqat shu ro'yxatdagilari ruxsat. */
  const expectExactly = (
    hasDelivery: boolean,
    allowed: [OrderStatus, OrderStatus][],
  ) => {
    for (const from of all) {
      for (const to of all) {
        const expected = allowed.some(([a, b]) => a === from && b === to);
        expect([from, to, canTransition(from, to, hasDelivery)]).toEqual([
          from,
          to,
          expected,
        ]);
      }
    }
  };

  it('yetkazib berish yo‘li — to‘liq matritsa', () => {
    expectExactly(true, [
      [S.NEW, S.SEARCHING_TRANSPORT],
      [S.NEW, S.CANCELLED],
      [S.SEARCHING_TRANSPORT, S.LOADING],
      [S.SEARCHING_TRANSPORT, S.CANCELLED],
      [S.LOADING, S.DELIVERING],
      [S.LOADING, S.CANCELLED],
      [S.DELIVERING, S.DELIVERED],
    ]);
  });

  it('olib ketish yo‘li — to‘liq matritsa', () => {
    expectExactly(false, [
      [S.NEW, S.LOADING],
      [S.NEW, S.CANCELLED],
      [S.LOADING, S.DELIVERED],
      [S.LOADING, S.CANCELLED],
    ]);
  });

  it('yakuniy holatlardan chiqish yo‘q', () => {
    for (const hasDelivery of [true, false]) {
      expect(allowedNextStatuses(S.DELIVERED, hasDelivery)).toEqual([]);
      expect(allowedNextStatuses(S.CANCELLED, hasDelivery)).toEqual([]);
    }
  });
});

describe('phoneKey', () => {
  it.each([
    ['+998 90 123-45-67', '901234567'],
    ['998901234567', '901234567'],
    ['(90) 123 45 67', '901234567'],
    ['12345', null],
  ])('%s → %s', (input, expected) => {
    expect(phoneKey(input)).toBe(expected);
  });
});

describe('OrderStatusService (B-029)', () => {
  let service: OrderStatusService;
  let tx: {
    order: { updateMany: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
  };
  let prisma: {
    order: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };

  const andijonManager: Actor = {
    id: 'u1',
    type: 'USER',
    role: UserRole.MANAGER,
    branchId: 'andijon',
  };
  const superAdmin: Actor = {
    id: 'u0',
    type: 'USER',
    role: UserRole.SUPER_ADMIN,
    branchId: null,
  };

  const order = (over: Record<string, unknown> = {}) => ({
    status: S.NEW,
    branchId: 'andijon',
    transportTypeId: 'fura',
    ...over,
  });

  beforeEach(async () => {
    tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order()),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'o1',
          orderNumber: 'VK-2026-000001',
          status: S.SEARCHING_TRANSPORT,
          transportTypeId: 'fura',
          statusHistory: [],
        }),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStatusService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(OrderStatusService);
  });

  describe('change', () => {
    it('ruxsat etilgan o‘tish: optimistik yangilash + tarix (kim, izoh)', async () => {
      const result = await service.change(andijonManager, 'o1', {
        status: S.SEARCHING_TRANSPORT,
        note: 'Mashina qidirilmoqda',
      });

      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o1', status: S.NEW },
        data: { status: S.SEARCHING_TRANSPORT },
      });
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'o1',
          status: S.SEARCHING_TRANSPORT,
          changedByUserId: 'u1',
          note: 'Mashina qidirilmoqda',
        },
      });
      expect(result.allowedNextStatuses).toEqual([S.LOADING, S.CANCELLED]);
    });

    it('🔒 boshqa filial buyurtmasi — 404, mavjud bo‘lmagani bilan bir xil matn', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        order({ branchId: 'fargona' }),
      );
      const foreign = await service
        .change(andijonManager, 'o1', { status: S.SEARCHING_TRANSPORT })
        .catch((error: Error) => error);

      prisma.order.findUnique.mockResolvedValueOnce(null);
      const missing = await service
        .change(andijonManager, 'x', { status: S.SEARCHING_TRANSPORT })
        .catch((error: Error) => error);

      expect(foreign).toBeInstanceOf(NotFoundException);
      expect((foreign as Error).message).toBe((missing as Error).message);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('filialsiz buyurtma — faqat SUPER_ADMIN', async () => {
      prisma.order.findUnique.mockResolvedValue(order({ branchId: null }));
      await expect(
        service.change(andijonManager, 'o1', { status: S.SEARCHING_TRANSPORT }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.change(superAdmin, 'o1', { status: S.SEARCHING_TRANSPORT }),
      ).resolves.toBeDefined();
    });

    it.each([
      ['o‘sha holat', order(), S.NEW, 'allaqachon'],
      ['qadam sakrash', order(), S.DELIVERED, 'Ruxsat etilgan'],
      ['yakuniydan orqaga', order({ status: S.DELIVERED }), S.NEW, 'yakuniy'],
      [
        'olib ketishda mashina qidirish',
        order({ transportTypeId: null }),
        S.SEARCHING_TRANSPORT,
        'LOADING',
      ],
    ])('%s — 400', async (_label, current, next, text) => {
      prisma.order.findUnique.mockResolvedValueOnce(current);
      const error = await service
        .change(superAdmin, 'o1', { status: next })
        .catch((e: Error) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toContain(text);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('🔒 poyga: holat oraliqda o‘zgargan — 409, tarix yozilmaydi', async () => {
      tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.change(superAdmin, 'o1', { status: S.CANCELLED }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('track', () => {
    const tracked = (over: Record<string, unknown> = {}) => ({
      orderNumber: 'VK-2026-000001',
      status: S.LOADING,
      createdAt: new Date('2026-09-14'),
      guestPhone: null,
      customer: { phone: '+998901234567' },
      region: { name: 'Toshkent shahri' },
      statusHistory: [{ status: S.NEW, createdAt: new Date('2026-09-14') }],
      ...over,
    });

    it('telefon formati farq qilsa ham topiladi; faqat holat va vaqt', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(tracked());
      const result = await service.track('VK-2026-000001', '90 123 45 67');

      expect(result).toEqual({
        orderNumber: 'VK-2026-000001',
        status: S.LOADING,
        statusHistory: [{ status: S.NEW, createdAt: new Date('2026-09-14') }],
        regionName: 'Toshkent shahri',
        createdAt: new Date('2026-09-14'),
      });
    });

    it('menejer kiritgan buyurtma — guestPhone bilan', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        tracked({ customer: null, guestPhone: '+998 93 555 44 33' }),
      );
      await expect(
        service.track('VK-2026-000001', '+998935554433'),
      ).resolves.toBeDefined();
    });

    it.each([
      ['telefon mos emas', tracked(), '+998907777777'],
      ['telefon juda qisqa', tracked(), '4567'],
      ['buyurtma yo‘q', null, '+998901234567'],
      [
        'filial ta‘minot buyurtmasi (egasi telefoni yo‘q)',
        tracked({ customer: null, guestPhone: null }),
        '+998901234567',
      ],
    ])('🔒 %s — 404 (bir xil javob)', async (_label, row, phone) => {
      prisma.order.findUnique.mockResolvedValueOnce(row);
      await expect(service.track('VK-2026-000001', phone)).rejects.toThrow(
        new NotFoundException('Buyurtma topilmadi'),
      );
    });
  });
});
