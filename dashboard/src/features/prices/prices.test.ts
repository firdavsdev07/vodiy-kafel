import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import {
  branchPriceConfig,
  superAdminPriceConfig,
  toggleActiveBody,
  toPricesQuery,
  validatePrice,
  type BranchPrice,
} from './prices';

const url = '?branchId=fargona&productId=p1&isActive=false&page=2';
const q = (config: typeof branchPriceConfig) => toPricesQuery(parseListParams(new URLSearchParams(url), config));

const row: BranchPrice = {
  id: 'bp1',
  branch: { id: 'andijon', name: 'Andijon', city: 'Andijon' },
  product: { id: 'p1', name: 'Marmar', slug: 'marmar', isActive: true },
  pricePerSqm: '85000.00',
  isActive: true,
  createdAt: '2026-09-13T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

describe('filial narxlari (D-016)', () => {
  it('🔒 G5: filial admini URL dagi branchId ni YUBORMAYDI', () => {
    expect(q(branchPriceConfig)).toEqual({ page: 2, limit: 20, productId: 'p1', isActive: false });
    expect(q(superAdminPriceConfig)).toEqual({ page: 2, limit: 20, branchId: 'fargona', productId: 'p1', isActive: false });
  });

  it('narx: backend qoidasi (12,2)', () => {
    expect(validatePrice('85000')).toBeNull();
    expect(validatePrice('85000.5')).toBeNull();
    expect(validatePrice('0')).not.toBeNull();
    expect(validatePrice('85000.555')).not.toBeNull();
    expect(validatePrice('')).toBe('Summani kiriting');
  });

  it('holatni almashtirish: joriy narx bilan PUT; branchId faqat SUPER_ADMIN', () => {
    expect(toggleActiveBody(row, false)).toEqual({ productId: 'p1', pricePerSqm: '85000.00', isActive: false });
    expect(toggleActiveBody(row, true)).toEqual({
      branchId: 'andijon',
      productId: 'p1',
      pricePerSqm: '85000.00',
      isActive: false,
    });
  });
});
