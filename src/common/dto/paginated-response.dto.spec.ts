import { paginate } from './paginated-response.dto';

describe('paginate', () => {
  it('items, total va totalPages ni to‘g‘ri hisoblaydi', () => {
    const result = paginate(['a', 'b'], 45, { page: 2, limit: 20 });
    expect(result).toEqual({
      items: ['a', 'b'],
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it('total 0 bo‘lsa ham totalPages kamida 1', () => {
    const result = paginate([], 0, { page: 1, limit: 20 });
    expect(result.totalPages).toBe(1);
  });
});
