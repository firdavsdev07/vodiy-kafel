import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { AccountTransactionType } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { subtractMoney, toMoney } from '../../common/utils';
import { Prisma, PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import { AccountLedgerService } from './account-ledger.service';
import type {
  AccountSummaryDto,
  AccountTransactionAdminDto,
  AccountTransactionDto,
  AccountTransactionQueryDto,
  CreateAccountTransactionDto,
} from './dto';

const CUSTOMER_NOT_FOUND = 'Mijoz topilmadi';

const TRANSACTION_SELECT = {
  id: true,
  type: true,
  amount: true,
  orderId: true,
  paymentId: true,
  note: true,
  createdAt: true,
  order: { select: { orderNumber: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

type TransactionRow = Prisma.AccountTransactionGetPayload<{
  select: typeof TRANSACTION_SELECT;
}>;

/**
 * Mijoz hisobi (B-035, TZ 3.11).
 *
 * ⚠ Balans hech qachon to'g'ridan-to'g'ri yozilmaydi (qoida 9): har
 *   o'zgarish — `AccountLedgerService` orqali yangi tranzaksiya. Tranzaksiya
 *   o'chirilmaydi va o'zgartirilmaydi (baza triggeri) — xato teskari
 *   ADJUSTMENT bilan tuzatiladi.
 *
 * Avtomatik yozuvlar:
 *   DEBT       — buyurtma berilganda (OrdersService)
 *   PAYMENT    — to'lov PAID bo'lganda (PaymentSettlementService)
 *   ADJUSTMENT — buyurtma bekor qilinganda qarz qaytariladi (OrderStatusService)
 * Qo'lda — `POST /admin/customers/:id/transactions` (TZ 7, savol 3:
 * "qo'lda ham, avtomatik ham").
 */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuoteService,
    private readonly branchScope: BranchScopeService,
    private readonly ledger: AccountLedgerService,
  ) {}

  // — Mijoz kabineti —

  async getMine(actor: Actor | undefined): Promise<AccountSummaryDto> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    return this.summary(customerId);
  }

  async findMineTransactions(
    actor: Actor | undefined,
    query: AccountTransactionQueryDto,
  ): Promise<PaginatedResult<AccountTransactionDto>> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const page = await this.transactions(customerId, query);
    // Mijozga xodim va to'lov ichki ID lari berilmaydi.
    return {
      ...page,
      items: page.items.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        note: item.note,
        createdAt: item.createdAt,
      })),
    };
  }

  // — Admin —

  async getForCustomer(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<AccountSummaryDto> {
    await this.requireCustomerInScope(actor, customerId);
    return this.summary(customerId);
  }

  async findForCustomer(
    actor: Actor | undefined,
    customerId: string,
    query: AccountTransactionQueryDto,
  ): Promise<PaginatedResult<AccountTransactionAdminDto>> {
    await this.requireCustomerInScope(actor, customerId);
    return this.transactions(customerId, query);
  }

  /**
   * Qo'lda harakat. DEBT/PAYMENT summasi musbat keladi — ishorani shu yer
   * qo'yadi (frontend "−" ni unutib, qarzni oshirib yubormasin).
   */
  async createForCustomer(
    actor: Actor | undefined,
    customerId: string,
    dto: CreateAccountTransactionDto,
  ): Promise<AccountSummaryDto> {
    await this.requireCustomerInScope(actor, customerId);

    const amount = toMoney(dto.amount);
    if (dto.type !== AccountTransactionType.ADJUSTMENT && amount.isNegative()) {
      throw new BadRequestException(
        'DEBT va PAYMENT summasi musbat yuboriladi — ishorani tizim qo‘yadi',
      );
    }
    const signed =
      dto.type === AccountTransactionType.PAYMENT ? amount.neg() : amount;

    await this.prisma.$transaction((tx) =>
      this.ledger.record(tx, {
        customerId,
        type: dto.type,
        amount: signed,
        createdByUserId: actor?.type === 'USER' ? actor.id : null,
        note: dto.note,
      }),
    );
    return this.summary(customerId);
  }

  // — Ichki —

  private async requireCustomerInScope(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { branchId: true },
    });
    // Mavjud emas va "begona filial" — BIR XIL javob (qoida 5).
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      customer.branchId,
      CUSTOMER_NOT_FOUND,
      'CUSTOMERS',
    );
  }

  private async summary(customerId: string): Promise<AccountSummaryDto> {
    const account = await this.prisma.customerAccount.findUnique({
      where: { customerId },
      select: { totalPurchased: true, totalPaid: true },
    });
    // Hisob yozuvi hali yo'q — birinchi harakatgacha hammasi nol.
    const purchased = account?.totalPurchased ?? toMoney(0);
    const paid = account?.totalPaid ?? toMoney(0);
    return {
      totalPurchased: purchased.toString(),
      totalPaid: paid.toString(),
      balance: subtractMoney(purchased, paid).toString(),
    };
  }

  private async transactions(
    customerId: string,
    query: AccountTransactionQueryDto,
  ): Promise<PaginatedResult<AccountTransactionAdminDto>> {
    const where: Prisma.AccountTransactionWhereInput = {
      customerId,
      ...(query.type && { type: query.type }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.accountTransaction.count({ where }),
      this.prisma.accountTransaction.findMany({
        where,
        select: TRANSACTION_SELECT,
        orderBy: [{ createdAt: query.sortOrder }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return paginate(rows.map(toAdminDto), total, query);
  }
}

function toAdminDto(row: TransactionRow): AccountTransactionAdminDto {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount.toString(),
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? null,
    paymentId: row.paymentId,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}
