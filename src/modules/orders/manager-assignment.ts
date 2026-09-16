import { Injectable } from '@nestjs/common';
import { OrderStatus, UserRole } from '../../common/enums';
import { PrismaService } from '../../prisma';

export interface ManagerAssignmentInput {
  /** Buyurtma filiali. */
  branchId: string;
  /**
   * Afzal ko'rilgan xodim: mijozga biriktirilgan menejer yoki buyurtmani
   * qo'lda kiritayotgan menejer. Hali ham yaroqli bo'lsa — u qoladi.
   */
  preferredManagerId: string | null;
}

/**
 * Buyurtmaga qaysi menejer biriktiriladi (B-043).
 *
 * ❓ TZ 3.12 va 7-bo'lim ochiq savoli. Shuning uchun interfeys: javob
 *    kelganda (round-robin, mahsulot turi bo'yicha…) yangi klass yoziladi va
 *    `orders.module` dagi bitta qator almashadi — buyurtma kodi o'zgarmaydi.
 */
export interface ManagerAssignmentStrategy {
  pick(input: ManagerAssignmentInput): Promise<string | null>;
}

export const MANAGER_ASSIGNMENT_STRATEGY = Symbol(
  'MANAGER_ASSIGNMENT_STRATEGY',
);

/** Buyurtma "ochiq" — menejer hali u bilan band. */
const OPEN_STATUSES = [
  OrderStatus.NEW,
  OrderStatus.SEARCHING_TRANSPORT,
  OrderStatus.LOADING,
  OrderStatus.DELIVERING,
];

/** Afzal xodim sifatida qabul qilinadigan rollar (B-030 bilan bir xil). */
const ASSIGNABLE_ROLES = [
  UserRole.MANAGER,
  UserRole.BRANCH_ADMIN,
  UserRole.MODERATOR,
];

/**
 * BY_BRANCH — birinchi implementatsiya:
 *   1. Afzal xodim faol va SHU filialniki bo'lsa — u.
 *   2. Aks holda — filialning faol MENEJERlaridan ochiq buyurtmasi eng
 *      kami (teng bo'lsa — eng eski hisob). Yuk teng taqsimlanadi.
 *   3. Filialda menejer yo'q — `null` (filial admini qo'lda biriktiradi).
 */
@Injectable()
export class ByBranchAssignmentStrategy implements ManagerAssignmentStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async pick({
    branchId,
    preferredManagerId,
  }: ManagerAssignmentInput): Promise<string | null> {
    if (preferredManagerId) {
      const preferred = await this.prisma.user.findFirst({
        where: {
          id: preferredManagerId,
          branchId,
          isActive: true,
          role: { in: ASSIGNABLE_ROLES },
        },
        select: { id: true },
      });
      if (preferred) return preferred.id;
    }

    const managers = await this.prisma.user.findMany({
      where: { branchId, isActive: true, role: UserRole.MANAGER },
      select: {
        id: true,
        _count: {
          select: {
            managedOrders: { where: { status: { in: OPEN_STATUSES } } },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (managers.length === 0) return null;

    // Barqaror saralash — teng yukda createdAt tartibi saqlanadi.
    return [...managers].sort(
      (a, b) => a._count.managedOrders - b._count.managedOrders,
    )[0].id;
  }
}
