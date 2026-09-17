import { describe, expect, it } from 'vitest';
import { customerProfileSchema, profileDefaults, toUpdateCustomerBody, type CustomerDetail } from './customer-profile';

const c: CustomerDetail = {
  id: 'c1',
  login: 'qurilish',
  companyName: 'Qurilish Invest',
  inn: '301234567',
  contactName: 'Aliyev Vali',
  phone: '+998901234567',
  branch: { id: 'b1', name: 'Andijon' },
  manager: { id: 'm1', fullName: 'Karimov' },
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-09-01T10:00:00.000Z',
  createdBy: { id: 'u1', fullName: 'Admin' },
  updatedAt: '2026-09-01T10:00:00.000Z',
  account: { totalPurchased: '0.00', totalPaid: '0.00', balance: '0.00' },
  recentOrders: [],
  recentTransactions: [],
};
const all = { changeBranch: true, assignManager: true };
const parse = (over: Partial<ReturnType<typeof profileDefaults>> = {}) => customerProfileSchema.parse({ ...profileDefaults(c), ...over });

describe('mijoz profili (D-022)', () => {
  it('o‘zgarmagan forma → bo‘sh tana (telefon formatlangan bo‘lsa ham)', () => {
    expect(profileDefaults(c).phone).toBe('+998 90 123 45 67');
    expect(toUpdateCustomerBody(parse(), c, all)).toEqual({});
  });

  it('tozalash: inn va menejer → null', () => {
    expect(toUpdateCustomerBody(parse({ inn: '', managerId: '' }), c, all)).toEqual({ inn: null, managerId: null });
  });

  it('🔒 filial: faqat ruxsat bo‘lsa; o‘zgarsa menejer yuborilmaydi', () => {
    expect(toUpdateCustomerBody(parse({ branchId: 'b2', managerId: 'm9' }), c, all)).toEqual({ branchId: 'b2' });
    expect(toUpdateCustomerBody(parse({ branchId: 'b2' }), c, { changeBranch: false, assignManager: true })).toEqual({});
    expect(toUpdateCustomerBody(parse({ managerId: 'm2' }), c, { changeBranch: false, assignManager: false })).toEqual({});
  });
});
