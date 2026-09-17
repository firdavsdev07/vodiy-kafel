import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import {
  balanceEffect,
  isNegativeAmount,
  toCreateTransactionBody,
  toTransactionsQuery,
  transactionDefaults,
  transactionListConfig,
  transactionSchema,
} from './transactions';

const parse = (over: Partial<typeof transactionDefaults> = {}) =>
  transactionSchema.safeParse({ ...transactionDefaults, amount: '150000', note: 'Naqd to‘lov', ...over });

describe('hisob yozuvi (D-023)', () => {
  it('DEBT va PAYMENT summasi MUSBAT yuboriladi — ishorani backend qo‘yadi', () => {
    const payment = parse({ type: 'PAYMENT', direction: 'DECREASE' });
    const debt = parse({ type: 'DEBT', direction: 'DECREASE' });
    expect(payment.success && toCreateTransactionBody(payment.data)).toEqual({ type: 'PAYMENT', amount: '150000', note: 'Naqd to‘lov' });
    // direction DEBT/PAYMENT da e'tiborga olinmaydi
    expect(debt.success && toCreateTransactionBody(debt.data).amount).toBe('150000');
  });

  it('tuzatish: yo‘nalish ishorani belgilaydi', () => {
    const down = parse({ type: 'ADJUSTMENT', direction: 'DECREASE', amount: '1500.5' });
    const up = parse({ type: 'ADJUSTMENT', direction: 'INCREASE' });
    expect(down.success && toCreateTransactionBody(down.data).amount).toBe('-1500.5');
    expect(up.success && toCreateTransactionBody(up.data).amount).toBe('150000');
  });

  it('summa: bo‘sh, nol, 2 dan ortiq kasr — rad etiladi', () => {
    expect(parse({ amount: '' }).success).toBe(false);
    expect(parse({ amount: '0' }).success).toBe(false);
    expect(parse({ amount: '0.00' }).success).toBe(false);
    expect(parse({ amount: '10.123' }).success).toBe(false);
    expect(parse({ amount: '1234567890123' }).success).toBe(false);
  });

  it('izoh majburiy: kamida 3, ko‘pi bilan 500 belgi (bo‘shliqlar kesiladi)', () => {
    expect(parse({ note: '  ab ' }).success).toBe(false);
    expect(parse({ note: 'x'.repeat(501) }).success).toBe(false);
    const ok = parse({ note: '  abc ' });
    expect(ok.success && ok.data.note).toBe('abc');
  });

  it('balansga ta’sir backend ishorasi bilan bir xil', () => {
    expect(balanceEffect({ type: 'DEBT', direction: 'DECREASE' })).toBe('increase');
    expect(balanceEffect({ type: 'PAYMENT', direction: 'INCREASE' })).toBe('decrease');
    expect(balanceEffect({ type: 'ADJUSTMENT', direction: 'INCREASE' })).toBe('increase');
    expect(balanceEffect({ type: 'ADJUSTMENT', direction: 'DECREASE' })).toBe('decrease');
  });

  it('ishora satrdan o‘qiladi (G6)', () => {
    expect(isNegativeAmount('-8000000')).toBe(true);
    expect(isNegativeAmount('3369600')).toBe(false);
  });

  it('ro‘yxat so‘rovi: noma’lum tur filtri tashlanadi', () => {
    const q = (search: string) => toTransactionsQuery(parseListParams(new URLSearchParams(search), transactionListConfig));
    expect(q('type=PAYMENT&page=2')).toEqual({ page: 2, limit: 20, type: 'PAYMENT' });
    expect(q('type=HACK')).toEqual({ page: 1, limit: 20 });
  });
});
