import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, OrderStatus, UserRole } from '../../common/enums';
import { Prisma, PrismaService } from '../../prisma';
import { InAppChannel } from './channels/in-app.channel';
import { MockSmsChannel } from './channels/mock-sms.channel';
import { MockTelegramChannel } from './channels/mock-telegram.channel';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from './channels/notification-channel.interface';
import { NotificationService } from './notification.service';

/** B-037 · hodisa → qabul qiluvchi → kanallar. */
describe('NotificationService (B-037)', () => {
  let service: NotificationService;
  let prisma: {
    order: { findUnique: jest.Mock };
    payment: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
    product: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    customer: { findMany: jest.Mock };
  };
  let inApp: { name: string; send: jest.Mock };
  let telegram: { name: string; send: jest.Mock; sendLocation: jest.Mock };
  let sms: { name: string; send: jest.Mock };

  const order = (over: Record<string, unknown> = {}) => ({
    id: 'o1',
    orderNumber: 'VK-2026-000007',
    status: OrderStatus.NEW,
    grandTotal: new Prisma.Decimal('1123200'),
    branchId: 'fargona',
    exactLat: null,
    exactLng: null,
    guestName: null,
    guestPhone: null,
    customer: { id: 'c1', companyName: 'Qurilish' },
    orderingBranch: null,
    manager: { id: 'm1', telegramUsername: 'menejer', isActive: true },
    ...over,
  });

  const recipientsOf = (mock: jest.Mock) =>
    mock.mock.calls.map(([recipient]: [unknown]) => recipient);

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order()) },
      payment: { findUnique: jest.fn() },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'm1', telegramUsername: 'menejer' },
          { id: 'a1', telegramUsername: null },
        ]),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'p1',
          slug: 'lyuks-60x60',
          name: 'Lyuks',
          size: { label: '60x60' },
          factory: { name: 'YONGXIN' },
        }),
      },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
    };
    inApp = { name: 'in-app', send: jest.fn().mockResolvedValue(undefined) };
    telegram = {
      name: 'telegram',
      send: jest.fn().mockResolvedValue(undefined),
      sendLocation: jest.fn().mockResolvedValue(undefined),
    };
    sms = { name: 'sms', send: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NOTIFICATION_CHANNELS, useValue: [inApp, telegram, sms] },
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
  });

  describe('order.created', () => {
    it('mijozga (kabinet) + filial xodimlariga; har kanalga', async () => {
      await service.onOrderCreated({ orderId: 'o1' });

      expect(recipientsOf(inApp.send)).toEqual([
        { customerId: 'c1' },
        { userId: 'm1', telegramUsername: 'menejer' },
        { userId: 'a1', telegramUsername: null },
      ]);
      const [, customerMessage] = inApp.send.mock.calls[0] as [
        unknown,
        { type: string; body: string; payload: unknown },
      ];
      expect(customerMessage).toMatchObject({
        type: NotificationType.ORDER_CREATED,
        payload: { orderId: 'o1' },
      });
      expect(customerMessage.body).toContain('VK-2026-000007');
      // Telegram/SMS ham chaqiriladi — manzil yo'q bo'lsa kanal o'zi o'tkazadi.
      expect(telegram.send).toHaveBeenCalledTimes(3);
      expect(sms.send).toHaveBeenCalledTimes(3);
    });

    it('xodimlar: filial admini/moderatori + biriktirilgan menejer, faqat faollar', async () => {
      await service.onOrderCreated({ orderId: 'o1' });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            {
              branchId: 'fargona',
              role: { in: [UserRole.BRANCH_ADMIN, UserRole.MODERATOR] },
            },
            { id: 'm1' },
          ],
        },
        select: { id: true, telegramUsername: true },
      });
    });

    it('hisobsiz xaridor — faqat telefon (SMS uchun), kabinet yozuvi yo‘q', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        order({
          customer: null,
          guestName: 'Ali',
          guestPhone: '+998901112233',
        }),
      );
      await service.onOrderCreated({ orderId: 'o1' });
      expect(recipientsOf(sms.send)[0]).toEqual({ phone: '+998901112233' });
    });

    it('🆕 ta’minot buyurtmasi (B-058) — xaridor: do‘kon filiali admini', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        order({
          customer: null,
          orderingBranch: { id: 'fargona', name: 'Farg‘ona' },
          branchId: 'markaz',
          manager: null,
        }),
      );
      prisma.user.findMany
        .mockResolvedValueOnce([{ id: 'fa', telegramUsername: null }])
        .mockResolvedValueOnce([{ id: 'mod', telegramUsername: null }]);

      await service.onOrderCreated({ orderId: 'o1' });

      expect(prisma.user.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          branchId: 'fargona',
          role: UserRole.BRANCH_ADMIN,
          isActive: true,
        },
        select: { id: true, telegramUsername: true },
      });
      expect(recipientsOf(inApp.send)).toEqual([
        { userId: 'fa', telegramUsername: null },
        { userId: 'mod', telegramUsername: null },
      ]);
      const [, staffMessage] = inApp.send.mock.calls[1] as [
        unknown,
        { body: string },
      ];
      expect(staffMessage.body).toContain('Ta’minot: Farg‘ona');
    });

    it('🆕 xaritadagi nuqta — faqat menejerga joylashuv (TZ 3.13)', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        order({ exactLat: 40.38, exactLng: 71.78 }),
      );
      await service.onOrderCreated({ orderId: 'o1' });
      expect(telegram.sendLocation).toHaveBeenCalledTimes(1);
      expect(telegram.sendLocation).toHaveBeenCalledWith(
        { userId: 'm1', telegramUsername: 'menejer' },
        40.38,
        71.78,
      );
    });

    it('nuqta bor, menejer yo‘q — filial rahbariyatiga', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(
        order({ exactLat: 40.38, exactLng: 71.78, manager: null }),
      );
      await service.onOrderCreated({ orderId: 'o1' });
      expect(telegram.sendLocation).toHaveBeenCalledTimes(2);
    });

    it('nuqta yo‘q — joylashuv yuborilmaydi', async () => {
      await service.onOrderCreated({ orderId: 'o1' });
      expect(telegram.sendLocation).not.toHaveBeenCalled();
    });
  });

  it('order.status.changed — faqat xaridorga, holat nomi va izoh bilan', async () => {
    await service.onOrderStatusChanged({
      orderId: 'o1',
      from: OrderStatus.NEW,
      to: OrderStatus.DELIVERING,
      note: 'Haydovchi: 90 123',
    });
    expect(recipientsOf(inApp.send)).toEqual([{ customerId: 'c1' }]);
    const [, message] = inApp.send.mock.calls[0] as [
      unknown,
      { type: string; title: string; body: string },
    ];
    expect(message.type).toBe(NotificationType.ORDER_STATUS_CHANGED);
    expect(message.title).toBe('Buyurtma: Yo‘lda');
    expect(message.body).toContain('Haydovchi: 90 123');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('payment.paid — xaridor va xodimlarga, summa bilan', async () => {
    prisma.payment.findUnique.mockResolvedValueOnce({
      amount: new Prisma.Decimal('500000'),
      order: order(),
    });
    await service.onPaymentPaid({ paymentId: 'p1' });

    expect(recipientsOf(inApp.send)).toHaveLength(3);
    const [, message] = inApp.send.mock.calls[0] as [
      unknown,
      { type: string; body: string; payload: unknown },
    ];
    expect(message).toMatchObject({
      type: NotificationType.PAYMENT_RECEIVED,
      payload: { orderId: 'o1', paymentId: 'p1' },
    });
    expect(message.body).toContain('500000');
  });

  describe('product.activated (B-040)', () => {
    const ids = (n: number, offset = 0) =>
      Array.from({ length: n }, (_v, i) => ({ id: `c${offset + i}` }));

    it('🔒 bir martalik da’vo: announcedAt bo‘sh, faol, zavodi faol', async () => {
      await service.onProductActivated({ productId: 'p1' });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'p1',
          isActive: true,
          announcedAt: null,
          factory: { isActive: true },
        },
        data: { announcedAt: expect.any(Date) as Date },
      });
    });

    it('allaqachon e’lon qilingan (count 0) — hech kimga yuborilmaydi', async () => {
      prisma.product.updateMany.mockResolvedValueOnce({ count: 0 });
      await service.onProductActivated({ productId: 'p1' });
      expect(prisma.customer.findMany).not.toHaveBeenCalled();
      expect(inApp.send).not.toHaveBeenCalled();
    });

    it('faqat faol optom mijozlarga, qismlab (100 tadan), NEW_PRODUCT + slug', async () => {
      prisma.customer.findMany
        .mockResolvedValueOnce(ids(100))
        .mockResolvedValueOnce(ids(30, 100));
      await service.onProductActivated({ productId: 'p1' });

      expect(inApp.send).toHaveBeenCalledTimes(130);
      expect(prisma.customer.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.customer.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { isActive: true },
          cursor: { id: 'c99' },
          skip: 1,
        }),
      );
      const [recipient, message] = inApp.send.mock.calls[0] as [
        unknown,
        { type: string; body: string; payload: unknown },
      ];
      expect(recipient).toEqual({ customerId: 'c0' });
      expect(message).toMatchObject({
        type: NotificationType.NEW_PRODUCT,
        payload: { productId: 'p1', slug: 'lyuks-60x60' },
      });
      expect(message.body).toBe('Lyuks (60x60) — YONGXIN');
    });
  });

  describe('🔒 ishonchlilik', () => {
    it('bitta kanal yiqilsa — qolganlari yuboradi, xato tashqariga chiqmaydi', async () => {
      telegram.send.mockRejectedValue(new Error('telegram down'));
      await expect(
        service.onOrderCreated({ orderId: 'o1' }),
      ).resolves.toBeUndefined();
      expect(inApp.send).toHaveBeenCalledTimes(3);
      expect(sms.send).toHaveBeenCalledTimes(3);
    });

    it('baza xatosi — tinglovchi yiqilmaydi', async () => {
      prisma.order.findUnique.mockRejectedValueOnce(new Error('db'));
      await expect(
        service.onOrderCreated({ orderId: 'o1' }),
      ).resolves.toBeUndefined();
    });

    it('buyurtma topilmadi — hech narsa yuborilmaydi', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await service.onOrderCreated({ orderId: 'nope' });
      expect(inApp.send).not.toHaveBeenCalled();
    });
  });
});

describe('Kanallar (B-037)', () => {
  const message = {
    type: NotificationType.ORDER_CREATED,
    title: 'T',
    body: 'B',
    payload: { orderId: 'o1' },
  };

  it('InAppChannel — mijoz YOKI xodim; manzilsiz — yozmaydi', async () => {
    const create = jest.fn().mockResolvedValue({});
    const channel = new InAppChannel({
      notification: { create },
    } as unknown as PrismaService);

    await channel.send({ customerId: 'c1', phone: '+998' }, message);
    await channel.send({ userId: 'u1', telegramUsername: 'x' }, message);
    await channel.send({ phone: '+998' }, message);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: { customerId: 'c1', ...message },
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      data: { userId: 'u1', ...message },
    });
  });

  it.each([
    ['telegram', new MockTelegramChannel()],
    ['sms', new MockSmsChannel()],
  ] as [string, NotificationChannel][])(
    '%s mock — xatosiz ishlaydi, manzilsiz ham',
    async (_name, channel) => {
      await expect(channel.send({}, message)).resolves.toBeUndefined();
      await expect(
        channel.send(
          { telegramUsername: 'x', phone: '+998901112233' },
          message,
        ),
      ).resolves.toBeUndefined();
    },
  );
});
