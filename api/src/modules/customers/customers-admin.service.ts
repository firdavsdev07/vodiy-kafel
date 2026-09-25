import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { SortOrder, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { subtractMoney, toMoney } from '../../common/utils';
import { Prisma, PrismaService } from '../../prisma';
import { AccountsService } from '../accounts/accounts.service';
import { AccountTransactionQueryDto } from '../accounts/dto';
import { PricingRulesAdminService } from '../pricing/pricing-rules-admin.service';
import type {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
  AdminCustomerQueryDto,
  CreateCustomerDto,
  CustomerCreatedResponseDto,
  UpdateCustomerDto,
} from './dto';
import { generateTemporaryPassword } from './temp-password';

const CUSTOMER_NOT_FOUND = 'Mijoz topilmadi';
const RECENT_LIMIT = 10;

/** Mijozga biriktirilishi mumkin bo'lgan xodim rollari (B-030 bilan bir xil). */
const ASSIGNABLE_ROLES: readonly UserRole[] = [
  UserRole.MANAGER,
  UserRole.BRANCH_ADMIN,
  UserRole.MODERATOR,
];

const LIST_SELECT = {
  id: true,
  login: true,
  companyName: true,
  inn: true,
  contactName: true,
  phone: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
  manager: { select: { id: true, fullName: true } },
  account: { select: { totalPurchased: true, totalPaid: true } },
} as const;

/**
 * Optom mijozlar — admin boshqaruvi (B-036).
 *
 * 🔒 Hisobni faqat xodim yaratadi (self-registration yo'q, qoida 4).
 * 🔒 Filial izolyatsiyasi `BranchScopeService` orqali: filial xodimi faqat
 *    o'z filiali mijozini ko'radi va yaratadi; begonasi — 404.
 * 🔒 Parol javobda FAQAT yaratishda bir marta; bazada bcrypt hash.
 */
@Injectable()
export class CustomersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly branchScope: BranchScopeService,
    private readonly accounts: AccountsService,
    private readonly pricingRules: PricingRulesAdminService,
  ) {}

  async findAll(
    actor: Actor | undefined,
    query: AdminCustomerQueryDto,
  ): Promise<PaginatedResult<AdminCustomerListItemDto>> {
    const scope = this.branchScope.resolve(actor, query.branchId, 'CUSTOMERS');
    const debtFilter = this.debtFilter(query.hasDebt);
    const where: Prisma.CustomerWhereInput = {
      ...this.branchScope.toPrismaFilter(scope),
      ...(query.managerId && { managerId: query.managerId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      AND: [
        ...(debtFilter ? [debtFilter] : []),
        ...(query.search ? [this.searchFilter(query.search)] : []),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [
          { createdAt: query.sortOrder ?? SortOrder.DESC },
          { id: 'asc' },
        ],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map(({ account, ...row }) => ({
        ...row,
        balance: subtractMoney(
          account?.totalPurchased ?? toMoney(0),
          account?.totalPaid ?? toMoney(0),
        ).toString(),
      })),
      total,
      query,
    );
  }

  async findOne(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<AdminCustomerDetailDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        ...LIST_SELECT,
        account: false,
        updatedAt: true,
        createdBy: { select: { id: true, fullName: true } },
        orders: {
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: RECENT_LIMIT,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      customer.branch.id,
      CUSTOMER_NOT_FOUND,
      'CUSTOMERS',
    );

    const [account, transactions] = await Promise.all([
      this.accounts.getForCustomer(actor, customerId),
      this.accounts.findForCustomer(
        actor,
        customerId,
        Object.assign(new AccountTransactionQueryDto(), {
          limit: RECENT_LIMIT,
        }),
      ),
    ]);

    const { orders, ...profile } = customer;
    return {
      ...profile,
      account,
      recentOrders: orders.map(({ payments, grandTotal, ...order }) => ({
        ...order,
        grandTotal: grandTotal.toString(),
        paymentStatus: payments[0]?.status ?? null,
      })),
      recentTransactions: transactions.items,
    };
  }

  async create(
    actor: Actor | undefined,
    dto: CreateCustomerDto,
  ): Promise<CustomerCreatedResponseDto> {
    const branchId = this.branchScope.requireBranchId(
      actor,
      dto.branchId,
      'CUSTOMERS',
    );
    await this.assertBranchActive(branchId);

    // T-007 (2026-09-25): AVTOMATIK biriktirish YO'Q — avval menejer o'zi
    // kiritgan mijozga o'zi biriktirilardi. Endi faqat aniq `managerId`
    // (yaratishda yoki keyin kartada, qo'lda).
    const managerId = dto.managerId ?? null;
    if (managerId) await this.assertAssignable(managerId, branchId);

    // Qoidalar mijozdan OLDIN tekshiriladi (ruxsat, chegara, nishon) —
    // xato bo'lsa hech narsa yozilmaydi. Yozish — mijoz bilan bitta so'rovda.
    const rules = dto.pricingRules?.length
      ? await this.pricingRules.prepare(actor, branchId, dto.pricingRules)
      : [];

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.authService.hashPassword(temporaryPassword);

    // 🆕 2026-09-18: `phone` endi mijozning kirish raqami ham (`POST
    // /auth/login`). `@unique` bazada faqat `customers` jadvali ICHIDA
    // himoyalaydi — xodim (`users`) bilan to'qnashuvni DASTUR darajasida
    // tekshiramiz, aks holda ikkala hisob ham shu raqam bilan yaratilib,
    // qaysi biri kirishini aniqlab bo'lmay qolardi.
    await this.assertPhoneNotStaff(dto.phone.trim());

    let id: string;
    try {
      ({ id } = await this.prisma.customer.create({
        data: {
          login: dto.login,
          passwordHash,
          mustChangePassword: true,
          companyName: dto.companyName.trim(),
          inn: dto.inn ?? null,
          contactName: dto.contactName.trim(),
          phone: dto.phone.trim(),
          branchId,
          managerId,
          // Guard xodim tokenini talab qiladi — mijoz bu yerga yetmaydi.
          createdByUserId: actor!.id,
          ...(rules.length > 0 && { pricingRules: { create: rules } }),
        },
        select: { id: true },
      }));
    } catch (error) {
      throw this.mapUniqueError(error);
    }

    return {
      customer: await this.findOne(actor, id),
      temporaryPassword,
    };
  }

  async update(
    actor: Actor | undefined,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<AdminCustomerDetailDto> {
    const current = await this.requireInScope(actor, customerId);

    // Filial ko'chirish — SUPER_ADMIN va MODERATOR (mijozlar domeni,
    // T-001). Filial xodimi o'zinikidan boshqasini bersa — 404 (resolve),
    // o'zinikini bersa — o'zgarish yo'q.
    const branchId =
      dto.branchId !== undefined
        ? this.branchScope.requireBranchId(actor, dto.branchId, 'CUSTOMERS')
        : current.branchId;
    const branchChanged = branchId !== current.branchId;
    if (branchChanged) await this.assertBranchActive(branchId);

    let managerId: string | null | undefined = dto.managerId;
    if (managerId) {
      await this.assertAssignable(managerId, branchId);
    } else if (managerId === undefined && branchChanged && current.managerId) {
      // Eski filial menejeri yangi filial mijozini o'z panelida ko'rmaydi —
      // bog'lanish uziladi (yangi menejer alohida beriladi).
      managerId = null;
    }

    const phone = dto.phone?.trim();
    if (phone !== undefined && phone !== current.phone) {
      await this.assertPhoneNotStaff(phone);
    }

    try {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(dto.companyName !== undefined && {
            companyName: dto.companyName.trim(),
          }),
          ...(dto.inn !== undefined && { inn: dto.inn }),
          ...(dto.contactName !== undefined && {
            contactName: dto.contactName.trim(),
          }),
          ...(phone !== undefined && { phone }),
          ...(branchChanged && { branchId }),
          ...(managerId !== undefined && { managerId }),
        },
      });
    } catch (error) {
      // ⚠ Avval bu yerda try/catch YO'Q edi — `phone` unikal bo'lmagani
      // uchun to'qnashuv umuman mumkin emas edi. Endi mumkin (2026-09-18).
      throw this.mapUniqueError(error);
    }
    return this.findOne(actor, customerId);
  }

  /**
   * Hisobni o'chirish/yoqish. O'chirilgan mijoz: login 401, refresh 401,
   * qo'lidagi access token bilan ham buyurtma bera olmaydi (servislar
   * `isActive` ni bazadan tekshiradi). Tarix va balans saqlanadi.
   */
  async setActive(
    actor: Actor | undefined,
    customerId: string,
    isActive: boolean,
  ): Promise<AdminCustomerDetailDto> {
    await this.requireInScope(actor, customerId);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive },
    });
    return this.findOne(actor, customerId);
  }

  // — Ichki —

  private async requireInScope(actor: Actor | undefined, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { branchId: true, managerId: true, phone: true },
    });
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      customer.branchId,
      CUSTOMER_NOT_FOUND,
      'CUSTOMERS',
    );
    return customer;
  }

  private async assertBranchActive(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { isActive: true },
    });
    if (!branch?.isActive) {
      throw new BadRequestException('Filial topilmadi yoki faol emas');
    }
  }

  private async assertAssignable(
    managerId: string,
    branchId: string,
  ): Promise<void> {
    const staff = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { branchId: true, role: true, isActive: true },
    });
    if (
      !staff?.isActive ||
      staff.branchId !== branchId ||
      !ASSIGNABLE_ROLES.includes(staff.role)
    ) {
      throw new BadRequestException(
        'Xodim topilmadi, faol emas yoki bu filialga tegishli emas',
      );
    }
  }

  /**
   * Qarz — keshlangan yig'indilar solishtiruvi (bitta so'rovda, ustun
   * havolasi bilan). Hisob yozuvi yo'q mijoz — qarzsiz.
   */
  private debtFilter(
    hasDebt: boolean | undefined,
  ): Prisma.CustomerWhereInput | null {
    if (hasDebt === undefined) return null;
    const totalPaid = this.prisma.customerAccount.fields.totalPaid;
    return hasDebt
      ? { account: { is: { totalPurchased: { gt: totalPaid } } } }
      : {
          OR: [
            { account: { is: null } },
            { account: { is: { totalPurchased: { lte: totalPaid } } } },
          ],
        };
  }

  private searchFilter(search: string): Prisma.CustomerWhereInput {
    const contains = { contains: search.trim(), mode: 'insensitive' as const };
    return {
      OR: [
        { login: contains },
        { companyName: contains },
        { contactName: contains },
        { phone: contains },
        { inn: contains },
      ],
    };
  }

  /**
   * `phone` @unique 2026-09-18 da qo'shildi — endi ikki xil maydon
   * to'qnashishi mumkin, shuning uchun `error.meta.target` bo'yicha
   * ANIQ qaysi biri ekanini ajratamiz (Prisma buni P2002 da beradi).
   */
  private mapUniqueError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes('phone')) {
        return new ConflictException('Bu telefon raqam bilan boshqa mijoz bor');
      }
      return new ConflictException('Bu login band — boshqasini tanlang');
    }
    return error;
  }

  /**
   * 🆕 2026-09-18: telefon endi mijozning kirish credential'i ham
   * (`POST /auth/login`), shuning uchun xodim (`users`) bilan bir xil
   * raqamda BO'LMASLIGI kerak — aks holda qaysi hisob kirishini
   * aniqlab bo'lmay qoladi. `users.phone` @unique, lekin bu — boshqa
   * jadval, DB bitta so'rov bilan ikkalasini birga tekshirolmaydi.
   */
  private async assertPhoneNotStaff(phone: string): Promise<void> {
    const staff = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (staff) {
      throw new ConflictException('Bu telefon raqam bilan xodim hisobi bor');
    }
  }
}
