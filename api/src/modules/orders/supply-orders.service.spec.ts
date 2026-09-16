import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  BranchType,
  OrderingType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, type PrismaService } from '../../prisma';
import { SupplyOrderQueryDto } from './dto';
import type { OrderStatusService } from './order-status.service';
import type { OrdersService } from './orders.service';
import { SupplyOrdersService } from './supply-orders.service';

/** B-058 · filial → markaziy ombor ta'minot buyurtmasi. */
describe('SupplyOrdersService (B-058)', () => {
  let service: SupplyOrdersService;
  let prisma: {
    branch: { findUnique: jest.Mock; findMany: jest.Mock };
    order: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };
  let orders: { place: jest.Mock; toCustomerDto: jest.Mock };
  let orderStatus: { change: jest.Mock };

  const staff = (role: UserRole, branchId: string | null): Actor => ({
    id: 'u1',
    type: 'USER',
    role,
    branchId,
  });
  const fargonaAdmin = staff(UserRole.BRANCH_ADMIN, 'fargona');
  const moderator = staff(UserRole.MODERATOR, 'markaz');
  const items = [{ productId: 'p1', pallets: 10 }];

  beforeEach(() => {
    prisma = {
      branch: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ type: BranchType.RETAIL, isActive: true }),
        findMany: jest.fn().mockResolvedValue([{ id: 'markaz' }]),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'o1',
          status: OrderStatus.NEW,
          transportTypeId: null,
          orderingBranch: { id: 'fargona', name: 'F' },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    orders = {
      place: jest.fn().mockResolvedValue('o1'),
      toCustomerDto: jest.fn().mockReturnValue({ id: 'o1' }),
    };
    orderStatus = { change: jest.fn().mockResolvedValue({ id: 'o1' }) };
    service = new SupplyOrdersService(
      prisma as unknown as PrismaService,
      orders as unknown as OrdersService,
      orderStatus as unknown as OrderStatusService,
      new BranchScopeService(),
    );
  });

  describe('yaratish', () => {
    it('🔒 place: bajaruvchi — markaz, xaridor — tokendagi do‘kon, to‘lov ichki', async () => {
      const result = await service.create(fargonaAdmin, {
        items,
        regionId: 'r1',
        transportTypeId: 't1',
      });
      expect(orders.place).toHaveBeenCalledWith({
        branchId: 'markaz',
        buyer: { orderingBranchId: 'fargona' },
        managerId: null,
        source: OrderSource.ADMIN,
        isUrgent: false,
        createdByUserId: 'u1',
        draft: {
          items,
          regionId: 'r1',
          transportTypeId: 't1',
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          note: undefined,
        },
      });
      expect(result).toMatchObject({
        orderingBranch: { id: 'fargona', name: 'F' },
        allowedNextStatuses: [OrderStatus.LOADING, OrderStatus.CANCELLED],
      });
    });

    it.each([
      ['moderator', moderator],
      ['SUPER_ADMIN', staff(UserRole.SUPER_ADMIN, null)],
      ['mijoz', { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' }],
    ])('🔒 %s — 403', async (_label, actor) => {
      await expect(service.create(actor, { items })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(orders.place).not.toHaveBeenCalled();
    });

    it('🔒 CENTRAL yoki yopiq filial xodimi — 403', async () => {
      prisma.branch.findUnique.mockResolvedValueOnce({
        type: BranchType.CENTRAL,
        isActive: true,
      });
      await expect(
        service.create(staff(UserRole.MANAGER, 'markaz'), { items }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('markaz bir nechta — centralBranchId majburiy (400)', async () => {
      prisma.branch.findMany.mockResolvedValueOnce([
        { id: 'm1' },
        { id: 'm2' },
      ]);
      await expect(
        service.create(fargonaAdmin, { items }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ko‘rsatilgan markaz CENTRAL emas / yopiq — 400', async () => {
      prisma.branch.findMany.mockResolvedValueOnce([]);
      await expect(
        service.create(fargonaAdmin, { items, centralBranchId: 'andijon' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.branch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: BranchType.CENTRAL, isActive: true, id: 'andijon' },
        }),
      );
    });
  });

  describe('ko‘rish', () => {
    const query = () => Object.assign(new SupplyOrderQueryDto(), {});

    it('🔒 do‘kon — faqat o‘z ta’minot buyurtmalari', async () => {
      await service.findMine(fargonaAdmin, query());
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orderingType: OrderingType.BRANCH,
            orderingBranchId: 'fargona',
          },
        }),
      );
    });

    it('🔒 moderator — faqat o‘z markaziga kelganlar', async () => {
      await service.findForCentral(moderator, query());
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderingType: OrderingType.BRANCH, branchId: 'markaz' },
        }),
      );
    });

    it('🔒 begona / mijoz buyurtmasi — 404', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.findMineOne(fargonaAdmin, 'o9'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'o9',
            orderingType: OrderingType.BRANCH,
            orderingBranchId: 'fargona',
          },
        }),
      );
    });
  });

  describe('holat', () => {
    it('🔒 mijoz buyurtmasi ID si — 404, holat o‘zgarmaydi', async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.changeStatus(moderator, 'customer-order', {
          status: OrderStatus.LOADING,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(orderStatus.change).not.toHaveBeenCalled();
    });

    it('ta’minot buyurtmasi — B-029 servisiga (filial doirasi o‘sha yerda)', async () => {
      await service.changeStatus(moderator, 'o1', {
        status: OrderStatus.LOADING,
      });
      expect(orderStatus.change).toHaveBeenCalledWith(moderator, 'o1', {
        status: OrderStatus.LOADING,
      });
    });
  });

  it('ro‘yxat elementi — summa satr, to‘lov holati', async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      {
        id: 'o1',
        orderNumber: 'VK-1',
        status: OrderStatus.NEW,
        totalPallets: 10,
        grandTotal: new Prisma.Decimal('500'),
        createdAt: new Date(),
        updatedAt: new Date(),
        branch: { id: 'markaz', name: 'M' },
        orderingBranch: { id: 'fargona', name: 'F' },
        payments: [],
      },
    ]);
    const page = await service.findForCentral(
      moderator,
      Object.assign(new SupplyOrderQueryDto(), {}),
    );
    expect(page.items[0]).toMatchObject({
      grandTotal: '500',
      paymentStatus: null,
      centralBranch: { id: 'markaz', name: 'M' },
    });
  });
});
