import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER } from './providers';

/** B-034 · to'lov oqimi. */
describe('PaymentsService (B-034)', () => {
  let service: PaymentsService;
  let events: { emit: jest.Mock };
  let prisma: {
    order: { findFirst: jest.Mock };
    payment: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let provider: { createPayment: jest.Mock };
  let settlement: { settle: jest.Mock };
  let quotes: { requireCustomer: jest.Mock };

  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' };
  const amount = new Prisma.Decimal('1123200');

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'pay1',
    method: PaymentMethod.CASH,
    status: PaymentStatus.PENDING,
    amount,
    providerRef: null,
    qrPayload: null,
    idempotencyKey: 'key1',
    ...over,
  });

  const order = (payments: unknown[] = [row()], over = {}) => ({
    id: 'o1',
    orderNumber: 'VK-2026-000007',
    status: OrderStatus.NEW,
    grandTotal: amount,
    payments,
    ...over,
  });

  beforeEach(async () => {
    events = { emit: jest.fn() };
    prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(order()) },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(row()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(prisma)),
    };
    provider = {
      createPayment: jest.fn().mockResolvedValue({
        providerRef: 'mock_1',
        qrPayload: 'QR',
        status: PaymentStatus.PENDING,
      }),
    };
    settlement = { settle: jest.fn().mockResolvedValue(true) };
    quotes = {
      requireCustomer: jest.fn().mockResolvedValue({ customerId: 'c1' }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: QuoteService, useValue: quotes },
        { provide: PaymentSettlementService, useValue: settlement },
        { provide: PAYMENT_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  describe('start — to‘lovni boshlash', () => {
    it('🔒 buyurtma faqat tokendagi mijoz bo‘yicha qidiriladi; begonasi 404', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.start(customer, 'o1', { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'o1', customerId: 'c1' } }),
      );
    });

    it('bekor qilingan buyurtma — 409', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        order([row()], { status: OrderStatus.CANCELLED }),
      );
      await expect(
        service.start(customer, 'o1', { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allaqachon to‘langan — 409, provayderga borilmaydi', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        order([row({ status: PaymentStatus.PAID })]),
      );
      await expect(
        service.start(customer, 'o1', { method: PaymentMethod.CARD }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(provider.createPayment).not.toHaveBeenCalled();
    });

    it('o‘sha usulda kutilayotgan (naqd) — o‘zi qaytadi, hech narsa yozilmaydi', async () => {
      const result = await service.start(customer, 'o1', {
        method: PaymentMethod.CASH,
      });
      expect(result).toEqual({
        paymentId: 'pay1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        amount: '1123200',
        qrPayload: null,
      });
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(provider.createPayment).not.toHaveBeenCalled();
    });

    it('naqd → karta (provayderga bormagan): usul almashadi, provayder o‘sha kalit bilan', async () => {
      prisma.payment.findUniqueOrThrow
        .mockResolvedValueOnce(row({ method: PaymentMethod.CARD }))
        .mockResolvedValueOnce(
          row({
            method: PaymentMethod.CARD,
            providerRef: 'mock_1',
            qrPayload: 'QR',
          }),
        );

      const result = await service.start(customer, 'o1', {
        method: PaymentMethod.CARD,
      });

      expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'pay1', status: PaymentStatus.PENDING },
        data: { method: PaymentMethod.CARD },
      });
      expect(provider.createPayment).toHaveBeenCalledWith(
        { id: 'o1', orderNumber: 'VK-2026-000007' },
        amount,
        'key1',
      );
      // 🔒 providerRef faqat hali bo'sh bo'lsa yoziladi (parallel so'rov).
      expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'pay1', status: PaymentStatus.PENDING, providerRef: null },
        data: { providerRef: 'mock_1', qrPayload: 'QR' },
      });
      expect(result).toMatchObject({ qrPayload: 'QR', amount: '1123200' });
    });

    it('karta (provayderda ochilgan) → naqd: eskisi CANCELLED, yangisi yaratiladi', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        order([row({ method: PaymentMethod.CARD, providerRef: 'mock_old' })]),
      );
      prisma.payment.create.mockResolvedValueOnce(
        row({ id: 'pay2', idempotencyKey: 'key2' }),
      );

      const result = await service.start(customer, 'o1', {
        method: PaymentMethod.CASH,
      });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'pay1', status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'o1',
            method: PaymentMethod.CASH,
            amount: '1123200',
            status: PaymentStatus.PENDING,
          }) as unknown,
        }),
      );
      expect(result.paymentId).toBe('pay2');
    });

    it('🔒 hammasi FAILED — yangi to‘lov, summa BUYURTMADAN (so‘rovdan emas)', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(
        order([row({ status: PaymentStatus.FAILED })]),
      );
      prisma.payment.create.mockResolvedValueOnce(row({ id: 'pay2' }));

      await service.start(customer, 'o1', { method: PaymentMethod.CASH });
      const [{ data }] = prisma.payment.create.mock.calls[0] as [
        { data: { amount: string; idempotencyKey: string } },
      ];
      expect(data.amount).toBe('1123200');
      expect(data.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('usul almashtirishda parallel so‘rov yutdi — 409', async () => {
      prisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.start(customer, 'o1', { method: PaymentMethod.BANK_TRANSFER }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getStatus', () => {
    it('🔒 faqat o‘z buyurtmasining to‘lovi; begonasi 404', async () => {
      prisma.payment.findFirst.mockResolvedValueOnce(null);
      await expect(service.getStatus(customer, 'pay1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay1', order: { customerId: 'c1' } },
        }),
      );
    });

    it('holat va vaqt', async () => {
      const paidAt = new Date('2026-09-16T10:00:00Z');
      prisma.payment.findFirst.mockResolvedValueOnce({
        id: 'pay1',
        status: PaymentStatus.PAID,
        paidAt,
      });
      await expect(service.getStatus(customer, 'pay1')).resolves.toEqual({
        paymentId: 'pay1',
        status: PaymentStatus.PAID,
        paidAt,
      });
    });
  });

  describe('confirm — admin tasdig‘i', () => {
    const admin = (role: UserRole, branchId: string | null): Actor => ({
      id: 'u1',
      type: 'USER',
      role,
      branchId,
    });
    const stored = (over: Record<string, unknown> = {}) => ({
      id: 'pay1',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      amount,
      orderId: 'o1',
      order: {
        orderNumber: 'VK-2026-000007',
        customerId: 'c1',
        branchId: 'fargona',
      },
      ...over,
    });

    beforeEach(() => {
      prisma.payment.findUnique.mockResolvedValue(stored());
      prisma.payment.findUniqueOrThrow.mockResolvedValue({
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      });
    });

    it('naqd — PAID, kim tasdiqlagani va izoh bilan', async () => {
      const actor = admin(UserRole.BRANCH_ADMIN, 'fargona');
      const result = await service.confirm(actor, 'pay1', { note: 'kv-17' });

      expect(settlement.settle).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ id: 'pay1' }),
        PaymentStatus.PAID,
        { confirmedByUserId: 'u1', note: 'kv-17' },
      );
      expect(result).toMatchObject({
        id: 'pay1',
        orderNumber: 'VK-2026-000007',
        status: PaymentStatus.PAID,
        amount: '1123200',
      });
      expect(events.emit).toHaveBeenCalledWith('payment.paid', {
        paymentId: 'pay1',
      });
    });

    it('🔒 boshqa filial to‘lovi — 404 (403 emas)', async () => {
      await expect(
        service.confirm(admin(UserRole.BRANCH_ADMIN, 'andijon'), 'pay1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(settlement.settle).not.toHaveBeenCalled();
    });

    it('🔒 karta to‘lovini qo‘lda tasdiqlab bo‘lmaydi — 400', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(
        stored({ method: PaymentMethod.CARD }),
      );
      await expect(
        service.confirm(admin(UserRole.SUPER_ADMIN, null), 'pay1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(settlement.settle).not.toHaveBeenCalled();
    });

    it.each([
      PaymentStatus.PAID,
      PaymentStatus.CANCELLED,
      PaymentStatus.FAILED,
    ])('%s — 409', async (status) => {
      prisma.payment.findUnique.mockResolvedValueOnce(stored({ status }));
      await expect(
        service.confirm(admin(UserRole.SUPER_ADMIN, null), 'pay1', {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('🔒 parallel tasdiq (settle false) — 409, ikkinchi yozuv yo‘q', async () => {
      settlement.settle.mockResolvedValueOnce(false);
      await expect(
        service.confirm(admin(UserRole.SUPER_ADMIN, null), 'pay1', {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('mavjud emas — 404', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.confirm(admin(UserRole.SUPER_ADMIN, null), 'nope', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
