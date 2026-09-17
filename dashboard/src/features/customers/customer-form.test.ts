import { describe, expect, it } from 'vitest';
import { customerCreateSchema, customerDefaults, suggestLogin, toCreateCustomerBody } from './customer-form';

const base = { ...customerDefaults, login: 'Fargona-Qurilish', companyName: '"Qurilish Invest" MChJ', contactName: 'Aliyev Vali', phone: '90 123 45 67' };

describe('mijoz yaratish formasi (D-021)', () => {
  it('login: kichik harfga, backend pattern', () => {
    const s = customerCreateSchema(false);
    expect(s.parse(base).login).toBe('fargona-qurilish');
    expect(s.safeParse({ ...base, login: 'ab' }).success).toBe(false);
    expect(s.safeParse({ ...base, login: '-abc' }).success).toBe(false);
    expect(s.safeParse({ ...base, login: 'ali vali' }).success).toBe(false);
    expect(s.safeParse({ ...base, login: 'a.b_c-1' }).success).toBe(true);
  });

  it('INN ixtiyoriy, bo‘lsa 9 raqam; telefon +998 ga keltiriladi', () => {
    const s = customerCreateSchema(false);
    expect(s.safeParse({ ...base, inn: '30123456' }).success).toBe(false);
    expect(s.parse({ ...base, inn: '301234567' }).inn).toBe('301234567');
    expect(s.parse(base).phone).toBe('+998901234567');
  });

  it('🔒 filial: SUPER_ADMIN uchun majburiy va yuboriladi; filial xodimida YUBORILMAYDI', () => {
    expect(customerCreateSchema(true).safeParse(base).success).toBe(false);
    const sa = customerCreateSchema(true).parse({ ...base, branchId: 'b2' });
    expect(toCreateCustomerBody(sa, true)).toMatchObject({ branchId: 'b2' });
    const ba = customerCreateSchema(false).parse({ ...base, branchId: 'b2' });
    expect(toCreateCustomerBody(ba, false)).not.toHaveProperty('branchId');
    expect(toCreateCustomerBody(ba, false)).not.toHaveProperty('inn');
  });

  it('login taklifi', () => {
    expect(suggestLogin('Farg‘ona Qurilish')).toBe('fargona-qurilish');
    expect(suggestLogin('"Qurilish Invest" MChJ')).toBe('qurilish-invest');
  });
});
