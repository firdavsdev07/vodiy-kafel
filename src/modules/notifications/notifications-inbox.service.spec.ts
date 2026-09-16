import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SortOrder, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import type { PrismaService } from '../../prisma';
import { NotificationQueryDto } from './dto/notification.dto';
import { NotificationsInboxService } from './notifications-inbox.service';

/** B-038 · bildirishnomalar qutisi. */
describe('NotificationsInboxService (B-038)', () => {
  let service: NotificationsInboxService;
  let prisma: {
    customer: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    notification: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'f' };
  const staff: Actor = {
    id: 'u1',
    type: 'USER',
    role: UserRole.MANAGER,
    branchId: 'f',
  };
  const row = {
    id: 'n1',
    type: 'ORDER_CREATED',
    title: 'T',
    body: 'B',
    payload: { orderId: 'o1' },
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  };
  const query = (over: Partial<NotificationQueryDto> = {}) =>
    Object.assign(new NotificationQueryDto(), {
      sortOrder: SortOrder.DESC,
      ...over,
    });

  beforeEach(() => {
    prisma = {
      customer: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
      user: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
      notification: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([row]),
        findFirst: jest.fn().mockResolvedValue({ ...row, isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new NotificationsInboxService(prisma as unknown as PrismaService);
  });

  it.each([
    ['mijoz', customer, { customerId: 'c1' }],
    ['xodim', staff, { userId: 'u1' }],
  ])('🔒 %s — faqat o‘z qutisi', async (_label, actor, owner) => {
    await service.findMine(actor, query({ isRead: false }));
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ...owner, isRead: false } }),
    );
    await service.unreadCount(actor);
    expect(prisma.notification.count).toHaveBeenLastCalledWith({
      where: { ...owner, isRead: false },
    });
  });

  it('isRead berilmasa — filtrsiz', async () => {
    await service.findMine(customer, query());
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'c1' } }),
    );
  });

  it('unread-count — son', async () => {
    await expect(service.unreadCount(customer)).resolves.toEqual({ count: 3 });
  });

  it('o‘chirilgan hisob — 401; tokensiz — 401', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce({ isActive: false });
    await expect(service.unreadCount(customer)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.unreadCount(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  describe('markRead', () => {
    it('faqat o‘qilmagan va o‘ziniki yangilanadi (isRead + readAt birga)', async () => {
      const result = await service.markRead(customer, 'n1');
      const [args] = prisma.notification.updateMany.mock.calls[0] as [
        { where: unknown; data: { isRead: boolean; readAt: Date } },
      ];
      expect(args.where).toEqual({
        id: 'n1',
        customerId: 'c1',
        isRead: false,
      });
      expect(args.data.isRead).toBe(true);
      expect(args.data.readAt).toBeInstanceOf(Date);
      expect(result.isRead).toBe(true);
    });

    it('🔒 begona yoki mavjud emas — 404', async () => {
      prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.notification.findFirst.mockResolvedValueOnce(null);
      await expect(service.markRead(staff, 'n1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.notification.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'n1', userId: 'u1' } }),
      );
    });
  });

  it('read-all — faqat o‘ziniki, soni qaytadi', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 5 });
    await expect(service.markAllRead(staff)).resolves.toEqual({ updated: 5 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
    );
  });
});
