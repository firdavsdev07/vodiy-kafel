import { describe, expect, it } from 'vitest';
import { toLeadsQuery } from './api';

const params = { page: 2, limit: 20, sortBy: undefined, sortOrder: undefined };

describe('toLeadsQuery (T-013)', () => {
  it('filtrlar API ga o‘tadi', () => {
    expect(toLeadsQuery({ ...params, filters: { status: 'NEW', search: 'Aziz', branchId: 'b1' } })).toEqual({
      page: 2,
      limit: 20,
      status: 'NEW',
      search: 'Aziz',
      branchId: 'b1',
    });
  });

  it('URL’dagi noma’lum holat tashlanadi — backend 400 bermasin', () => {
    expect(toLeadsQuery({ ...params, filters: { status: 'ARCHIVED' } })).toEqual({ page: 2, limit: 20 });
  });
});
