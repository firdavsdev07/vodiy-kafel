import { BadRequestException } from '@nestjs/common';
import { AccountTransactionType } from '../../common/enums';
import type { Prisma } from '../../prisma';
import { AccountLedgerService } from './account-ledger.service';

/** B-034 · hisob yozuvi — audit + keshlangan yig'indi bitta joyda. */
describe('AccountLedgerService', () => {
  const service = new AccountLedgerService();
  let tx: {
    accountTransaction: { create: jest.Mock };
    customerAccount: { upsert: jest.Mock };
  };

  beforeEach(() => {
    tx = {
      accountTransaction: { create: jest.fn().mockResolvedValue({}) },
      customerAccount: { upsert: jest.fn().mockResolvedValue({}) },
    };
  });

  const record = (type: AccountTransactionType, amount: string) =>
    service.record(tx as unknown as Prisma.TransactionClient, {
      customerId: 'c1',
      type,
      amount,
      paymentId: 'p1',
    });

  const upsertArgs = () =>
    (
      tx.customerAccount.upsert.mock.calls[0] as [
        {
          create: Record<string, Prisma.Decimal>;
          update: Record<string, { increment: Prisma.Decimal }>;
        },
      ]
    )[0];

  it('PAYMENT (manfiy) — tranzaksiya + totalPaid oshadi, totalPurchased 0', async () => {
    await record(AccountTransactionType.PAYMENT, '-1500.50');

    const [{ data }] = tx.accountTransaction.create.mock.calls[0] as [
      { data: { amount: Prisma.Decimal } & Record<string, unknown> },
    ];
    expect(data).toMatchObject({
      customerId: 'c1',
      type: AccountTransactionType.PAYMENT,
      paymentId: 'p1',
      orderId: null,
    });
    expect(data.amount.toString()).toBe('-1500.5');

    const { create, update } = upsertArgs();
    expect(create.totalPaid.toString()).toBe('1500.5');
    expect(create.totalPurchased.toString()).toBe('0');
    expect(update.totalPaid.increment.toString()).toBe('1500.5');
    expect(update.totalPurchased.increment.toString()).toBe('0');
  });

  it('DEBT (musbat) — totalPurchased oshadi', async () => {
    await record(AccountTransactionType.DEBT, '2000');
    const { update } = upsertArgs();
    expect(update.totalPurchased.increment.toString()).toBe('2000');
    expect(update.totalPaid.increment.toString()).toBe('0');
  });

  it.each([
    ['PAYMENT musbat', AccountTransactionType.PAYMENT, '100'],
    ['DEBT manfiy', AccountTransactionType.DEBT, '-100'],
    ['DEBT nol', AccountTransactionType.DEBT, '0'],
    ['ADJUSTMENT nol', AccountTransactionType.ADJUSTMENT, '0'],
  ])('%s — 400, hech narsa yozilmaydi', async (_label, type, amount) => {
    await expect(record(type, amount)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.accountTransaction.create).not.toHaveBeenCalled();
    expect(tx.customerAccount.upsert).not.toHaveBeenCalled();
  });
});
