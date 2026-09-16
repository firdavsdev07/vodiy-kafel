import { UserRole } from '../../common/enums';
import type { PrismaService } from '../../prisma';
import { ByBranchAssignmentStrategy } from './manager-assignment';

/** B-043 · BY_BRANCH menejer biriktirish. */
describe('ByBranchAssignmentStrategy (B-043)', () => {
  let strategy: ByBranchAssignmentStrategy;
  let findFirst: jest.Mock;
  let findMany: jest.Mock;

  const manager = (id: string, open: number) => ({
    id,
    _count: { managedOrders: open },
  });

  beforeEach(() => {
    findFirst = jest.fn().mockResolvedValue(null);
    findMany = jest.fn().mockResolvedValue([]);
    strategy = new ByBranchAssignmentStrategy({
      user: { findFirst, findMany },
    } as unknown as PrismaService);
  });

  it('afzal xodim faol va shu filialda — u qoladi', async () => {
    findFirst.mockResolvedValueOnce({ id: 'm-pref' });
    await expect(
      strategy.pick({ branchId: 'f', preferredManagerId: 'm-pref' }),
    ).resolves.toBe('m-pref');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'm-pref',
          branchId: 'f',
          isActive: true,
        }) as unknown,
      }),
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('afzal xodim yaroqsiz — eng kam ochiq buyurtmali menejer', async () => {
    findMany.mockResolvedValueOnce([
      manager('m1', 5),
      manager('m2', 1),
      manager('m3', 3),
    ]);
    await expect(
      strategy.pick({ branchId: 'f', preferredManagerId: 'boshqa-filial' }),
    ).resolves.toBe('m2');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'f', isActive: true, role: UserRole.MANAGER },
      }),
    );
  });

  it('teng yuk — eng eski (tartib saqlanadi)', async () => {
    findMany.mockResolvedValueOnce([manager('eski', 2), manager('yangi', 2)]);
    await expect(
      strategy.pick({ branchId: 'f', preferredManagerId: null }),
    ).resolves.toBe('eski');
  });

  it('filialda menejer yo‘q — null', async () => {
    await expect(
      strategy.pick({ branchId: 'f', preferredManagerId: null }),
    ).resolves.toBeNull();
  });
});
