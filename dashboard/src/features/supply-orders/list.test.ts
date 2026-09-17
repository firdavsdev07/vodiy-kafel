import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import { supplyBranchConfig, supplyReviewConfig, toSupplyOrdersQuery } from './list';

const query = (search: string, config = supplyReviewConfig) =>
  toSupplyOrdersQuery(parseListParams(new URLSearchParams(search), config));

describe('ta’minot buyurtmalari ro‘yxati (D-030)', () => {
  it('holat va buyurtmachi filial filtri; noma’lum holat tashlanadi', () => {
    expect(query('status=LOADING&orderingBranchId=b1&page=3')).toEqual({ page: 3, limit: 20, status: 'LOADING', orderingBranchId: 'b1' });
    expect(query('status=HACK')).toEqual({ page: 1, limit: 20 });
  });

  it('🔒 G5: filial tomonida orderingBranchId URL’dan o‘qilmaydi', () => {
    expect(query('orderingBranchId=b1&status=NEW', supplyBranchConfig)).toEqual({ page: 1, limit: 20, status: 'NEW' });
  });
});
