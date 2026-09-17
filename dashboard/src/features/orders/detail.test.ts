import { describe, expect, it } from 'vitest';
import { buyerOf, formatQuantity, isManuallyConfirmable, isZeroAmount } from './detail';

const base = { branch: { id: 'b1', name: 'Farg‘ona' }, branchName: 'Farg‘ona' };

describe('buyurtma kartasi (D-025)', () => {
  it('xaridor: hisobi bor mijoz / hisobsiz xaridor / filial ta’minoti', () => {
    expect(buyerOf({ ...base, buyer: { customerId: 'c1', name: 'Qurilish MChJ', contactName: 'Ali', phone: '+998901234567' } })).toEqual({
      kind: 'customer',
      customerId: 'c1',
      name: 'Qurilish MChJ',
      contactName: 'Ali',
      phone: '+998901234567',
    });
    expect(buyerOf({ ...base, buyer: { customerId: null, name: 'Vali', contactName: null, phone: '+998901112233' } })).toEqual({
      kind: 'guest',
      name: 'Vali',
      phone: '+998901112233',
    });
    expect(buyerOf({ ...base, buyer: null })).toEqual({ kind: 'branch', name: 'Farg‘ona' });
    expect(buyerOf({ branch: null, branchName: 'Andijon', buyer: null })).toEqual({ kind: 'branch', name: 'Andijon' });
  });

  it('miqdor satr ustida formatlanadi (G6)', () => {
    expect(formatQuantity('14.4000')).toBe('14,4');
    expect(formatQuantity('325')).toBe('325');
    expect(formatQuantity('0.50')).toBe('0,5');
  });

  it('nol summa aniqlanadi', () => {
    expect(isZeroAmount('0')).toBe(true);
    expect(isZeroAmount('0.00')).toBe(true);
    expect(isZeroAmount('150000')).toBe(false);
  });

  it('D-029: qo‘lda faqat kutilayotgan naqd/o‘tkazma tasdiqlanadi, karta — yo‘q', () => {
    expect(isManuallyConfirmable({ status: 'PENDING', method: 'CASH' })).toBe(true);
    expect(isManuallyConfirmable({ status: 'PENDING', method: 'BANK_TRANSFER' })).toBe(true);
    expect(isManuallyConfirmable({ status: 'PENDING', method: 'CARD' })).toBe(false);
    expect(isManuallyConfirmable({ status: 'PAID', method: 'CASH' })).toBe(false);
    expect(isManuallyConfirmable({ status: 'CANCELLED', method: 'CASH' })).toBe(false);
  });
});
