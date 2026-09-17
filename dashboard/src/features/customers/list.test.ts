import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import { branchCustomerConfig, superAdminCustomerConfig, toCustomersQuery } from './list';

const url = new URLSearchParams('search=qurilish&branchId=b2&isActive=false&hasDebt=true&page=3');

describe('mijozlar ro‘yxati (D-020)', () => {
  it('🔒 filial admini uchun branchId URL dan o‘qilmaydi', () => {
    expect(toCustomersQuery(parseListParams(url, branchCustomerConfig))).toEqual({
      page: 3,
      limit: 20,
      search: 'qurilish',
      isActive: false,
      hasDebt: true,
    });
    expect(toCustomersQuery(parseListParams(url, superAdminCustomerConfig))).toMatchObject({ branchId: 'b2' });
  });

  it('buzilgan boolean tashlanadi', () => {
    expect(toCustomersQuery(parseListParams(new URLSearchParams('isActive=ha'), branchCustomerConfig))).toEqual({
      page: 1,
      limit: 20,
    });
  });
});
