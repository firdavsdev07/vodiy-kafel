import { BadRequestException } from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { OrderStatus, PaymentStatus, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import type { PrismaService } from '../../prisma';
import type { NotificationsInboxService } from './notifications-inbox.service';
import { UpdatesService } from './updates.service';

/** B-039 · polling. */
describe('UpdatesService (B-039)', () => {
  let service: UpdatesService;
  let findMany: jest.Mock;
  let inbox: { unreadCount: jest.Mock; findSince: jest.Mock };

  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'f' };
  const orderRow = (id: string) => ({
    id,
    orderNumber: `VK-${id}`,
    status: OrderStatus.LOADING,
    updatedAt: new Date(),
    payments: [{ status: PaymentStatus.PAID }],
  });

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([orderRow('o1')]);
    inbox = {
      unreadCount: jest.fn().mockResolvedValue({ count: 2 }),
      findSince: jest.fn().mockResolvedValue([{ id: 'n1' }]),
    };
    service = new UpdatesService(
      { order: { findMany } } as unknown as PrismaService,
      inbox as unknown as NotificationsInboxService,
      new BranchScopeService(),
    );
  });

  it('since siz — faqat hisoblagich va serverTime, ro‘yxat so‘ralmaydi', async () => {
    const result = await service.getUpdates(customer, undefined);
    expect(result).toMatchObject({
      orders: [],
      notifications: [],
      unreadCount: 2,
      truncated: false,
    });
    expect(result.serverTime).toBeInstanceOf(Date);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('🔒 mijoz — faqat o‘z buyurtmalari; holat YOKI to‘lov o‘zgargani', async () => {
    const since = '2026-09-16T09:00:00.000Z';
    const result = await service.getUpdates(customer, since);

    const [{ where }] = findMany.mock.calls[0] as [{ where: unknown }];
    expect(where).toEqual({
      customerId: 'c1',
      OR: [
        { updatedAt: { gt: new Date(since) } },
        { payments: { some: { updatedAt: { gt: new Date(since) } } } },
      ],
    });
    expect(result.orders).toEqual([
      {
        id: 'o1',
        orderNumber: 'VK-o1',
        status: OrderStatus.LOADING,
        updatedAt: expect.any(Date) as Date,
        paymentStatus: PaymentStatus.PAID,
      },
    ]);
    expect(inbox.findSince).toHaveBeenCalledWith(
      customer,
      new Date(since),
      101,
    );
  });

  it('🔒 xodim — filial doirasi (B-051)', async () => {
    const manager: Actor = {
      id: 'u1',
      type: 'USER',
      role: UserRole.MANAGER,
      branchId: 'andijon',
    };
    await service.getUpdates(manager, '2026-09-16T09:00:00.000Z');
    const [{ where }] = findMany.mock.calls[0] as [{ where: object }];
    expect(where).toMatchObject({ branchId: 'andijon' });
  });

  it('100 dan ko‘p — kesiladi va truncated', async () => {
    findMany.mockResolvedValueOnce(
      Array.from({ length: 101 }, (_v, i) => orderRow(`o${i}`)),
    );
    const result = await service.getUpdates(
      customer,
      '2026-09-16T09:00:00.000Z',
    );
    expect(result.orders).toHaveLength(100);
    expect(result.truncated).toBe(true);
  });

  it('kelajakdagi since — 400', async () => {
    await expect(
      service.getUpdates(customer, '2999-01-01T00:00:00.000Z'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('serverTime so‘rovlardan OLDIN olinadi (o‘zgarish tushib qolmaydi)', async () => {
    let seenAt = 0;
    findMany.mockImplementationOnce(() => {
      seenAt = Date.now();
      return Promise.resolve([]);
    });
    const result = await service.getUpdates(
      customer,
      '2026-09-16T09:00:00.000Z',
    );
    expect(result.serverTime.getTime()).toBeLessThanOrEqual(seenAt);
  });
});
