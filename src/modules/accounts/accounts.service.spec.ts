import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  AccountTransactionType,
  SortOrder,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import { AccountLedgerService } from './account-ledger.service';
import { AccountsService } from './accounts.service';
import { AccountTransactionQueryDto } from './dto';

/** B-035 · mijoz hisobi. */
describe('AccountsService (B-035)', () => {
  let service: AccountsService;
  let prisma: {
    customer: { findUnique: jest.Mock };
    customerAccount: { findUnique: jest.Mock };
    accountTransaction: { count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let ledger: { record: jest.Mock };

  const D = (v: string) => new Prisma.Decimal(v);
  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' };
  const staff = (role: UserRole, branchId: string | null): Actor => ({
    id: 'u1',
    type: 'USER',
    role,
    branchId,
  });
  const query = () =>
    Object.assign(new AccountTransactionQueryDto(), {
      page: 1,
      limit: 20,
      sortOrder: SortOrder.DESC,
    });

  const txRow = {
    id: 't1',
    type: AccountTransactionType.PAYMENT,
    amount: D('-8000000'),
    orderId: 'o1',
    paymentId: 'p1',
    note: 'kv-17',
    createdAt: new Date('2026-09-16'),
    order: { orderNumber: 'VK-2026-000001' },
    createdBy: { id: 'u9', fullName: 'Farg‘ona admini' },
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({ branchId: 'fargona' }),
      },
      customerAccount: {
        findUnique: jest.fn().mockResolvedValue({
          totalPurchased: D('11369600'),
          totalPaid: D('8000000'),
        }),
      },
      accountTransaction: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([txRow]),
      },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn('tx')),
    };
    ledger = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountLedgerService, useValue: ledger },
        {
          provide: QuoteService,
          useValue: {
            requireCustomer: jest.fn().mockResolvedValue({ customerId: 'c1' }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  describe('mijoz kabineti', () => {
    it('balans = xarid − to‘langan', async () => {
      await expect(service.getMine(customer)).resolves.toEqual({
        totalPurchased: '11369600',
        totalPaid: '8000000',
        balance: '3369600',
      });
      expect(prisma.customerAccount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'c1' } }),
      );
    });

    it('hisob yozuvi hali yo‘q — nollar', async () => {
      prisma.customerAccount.findUnique.mockResolvedValueOnce(null);
      await expect(service.getMine(customer)).resolves.toEqual({
        totalPurchased: '0',
        totalPaid: '0',
        balance: '0',
      });
    });

    it('🔒 tarix — faqat tokendagi mijoz, xodim va to‘lov ID lari yo‘q', async () => {
      const page = await service.findMineTransactions(customer, query());
      expect(prisma.accountTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'c1' } }),
      );
      expect(page.items[0]).toEqual({
        id: 't1',
        type: AccountTransactionType.PAYMENT,
        amount: '-8000000',
        orderId: 'o1',
        orderNumber: 'VK-2026-000001',
        note: 'kv-17',
        createdAt: txRow.createdAt,
      });
    });
  });

  describe('admin', () => {
    it('🔒 boshqa filial mijozi — 404 (mavjud emas bilan bir xil)', async () => {
      const andijon = staff(UserRole.BRANCH_ADMIN, 'andijon');
      const error = await service
        .getForCustomer(andijon, 'c1')
        .catch((e: Error) => e);
      expect(error).toBeInstanceOf(NotFoundException);

      prisma.customer.findUnique.mockResolvedValueOnce(null);
      const missing = await service
        .getForCustomer(andijon, 'nope')
        .catch((e: Error) => e);
      expect((missing as Error).message).toBe((error as Error).message);
    });

    it('tarix — kim kiritgani va to‘lov ID si bilan', async () => {
      const page = await service.findForCustomer(
        staff(UserRole.MANAGER, 'fargona'),
        'c1',
        query(),
      );
      expect(page.items[0]).toMatchObject({
        paymentId: 'p1',
        createdBy: { id: 'u9', fullName: 'Farg‘ona admini' },
      });
    });

    it.each([
      [AccountTransactionType.DEBT, '150000', '150000'],
      [AccountTransactionType.PAYMENT, '150000', '-150000'],
      [AccountTransactionType.ADJUSTMENT, '-150000', '-150000'],
      [AccountTransactionType.ADJUSTMENT, '150000', '150000'],
    ])('%s %s → hisobga %s', async (type, amount, signed) => {
      await service.createForCustomer(
        staff(UserRole.BRANCH_ADMIN, 'fargona'),
        'c1',
        { type, amount, note: 'sabab' },
      );
      const [txArg, entry] = ledger.record.mock.calls[0] as [
        unknown,
        { amount: Prisma.Decimal } & Record<string, unknown>,
      ];
      expect(txArg).toBe('tx');
      expect(entry).toMatchObject({
        customerId: 'c1',
        type,
        createdByUserId: 'u1',
        note: 'sabab',
      });
      expect(entry.amount.toString()).toBe(signed);
    });

    it.each([AccountTransactionType.DEBT, AccountTransactionType.PAYMENT])(
      '%s manfiy summa — 400 (ishorani tizim qo‘yadi)',
      async (type) => {
        await expect(
          service.createForCustomer(staff(UserRole.SUPER_ADMIN, null), 'c1', {
            type,
            amount: '-100',
            note: 'sabab',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(ledger.record).not.toHaveBeenCalled();
      },
    );

    it('🔒 boshqa filial mijoziga yozib bo‘lmaydi — 404, yozuv yo‘q', async () => {
      await expect(
        service.createForCustomer(
          staff(UserRole.BRANCH_ADMIN, 'andijon'),
          'c1',
          {
            type: AccountTransactionType.ADJUSTMENT,
            amount: '-1',
            note: 'sabab',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ledger.record).not.toHaveBeenCalled();
    });
  });
});
