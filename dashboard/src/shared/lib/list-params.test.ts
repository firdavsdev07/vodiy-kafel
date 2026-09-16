import { describe, expect, it } from 'vitest';
import { pageRange, parseListParams, toApiQuery, writeListParams } from './list-params';

type F = { search: string; isActive: string };
const config = { filterKeys: ['search', 'isActive'] as const, sortKeys: ['name', 'createdAt'] };
const qs = (s: string) => new URLSearchParams(s);

describe('parseListParams (G10)', () => {
  it('standart qiymatlar', () => {
    expect(parseListParams<F>(qs(''), config)).toEqual({
      page: 1,
      limit: 20,
      sortBy: undefined,
      sortOrder: undefined,
      filters: {},
    });
  });

  it('URL dan o‘qiydi, begona parametr va noto‘g‘ri qiymat tashlanadi', () => {
    const p = parseListParams<F>(
      qs('page=3&limit=50&sortBy=name&sortOrder=desc&search=kafel&foo=bar&isActive='),
      config,
    );
    expect(p).toEqual({
      page: 3,
      limit: 50,
      sortBy: 'name',
      sortOrder: 'desc',
      filters: { search: 'kafel' },
    });
  });

  it('himoya: limit ≤ 100, page ≥ 1, ruxsatsiz sortBy', () => {
    const p = parseListParams<F>(qs('page=-2&limit=5000&sortBy=password&sortOrder=desc'), config);
    expect(p.page).toBe(1);
    expect(p.limit).toBe(100);
    expect(p.sortBy).toBeUndefined();
    expect(p.sortOrder).toBeUndefined();
    expect(parseListParams<F>(qs('page=1.5&limit=abc'), config)).toMatchObject({ page: 1, limit: 20 });
  });
});

describe('writeListParams', () => {
  it('filtr o‘zgarsa — 1-sahifaga', () => {
    const next = writeListParams<F>(qs('page=4&search=a'), { filters: { search: 'b' } }, config);
    expect(next.toString()).toBe('search=b');
  });

  it('filtr o‘zgarmasa — sahifa saqlanadi', () => {
    const next = writeListParams<F>(qs('page=4&search=a'), { filters: { search: 'a' } }, config);
    expect(next.get('page')).toBe('4');
  });

  it('filtrni olib tashlash, begona kalit yozilmaydi', () => {
    const next = writeListParams<F>(
      qs('search=a&isActive=true&tab=x'),
      { filters: { search: undefined, hacker: '1' } as never },
      config,
    );
    expect(next.toString()).toBe('isActive=true&tab=x');
  });

  it('saralash: 1-sahifaga; sortBy yo‘q bo‘lsa sortOrder ham yo‘q', () => {
    expect(
      writeListParams<F>(qs('page=2'), { sortBy: 'name', sortOrder: 'desc' }, config).toString(),
    ).toBe('sortBy=name&sortOrder=desc');
    expect(
      writeListParams<F>(qs('sortBy=name&sortOrder=desc'), { sortBy: undefined, sortOrder: 'desc' }, config).toString(),
    ).toBe('');
  });

  it('sahifa 1 va standart limit URL ga yozilmaydi', () => {
    expect(writeListParams<F>(qs('page=3'), { page: 1 }, config).toString()).toBe('');
    expect(writeListParams<F>(qs('limit=50&page=2'), { limit: 20 }, config).toString()).toBe('');
    expect(writeListParams<F>(qs(''), { page: 2 }, config).toString()).toBe('page=2');
  });

  it('toApiQuery: sortOrder standart asc', () => {
    expect(toApiQuery(parseListParams<F>(qs('sortBy=name&search=x'), config))).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
      search: 'x',
    });
  });
});

describe('pageRange', () => {
  it('kam sahifa — hammasi', () => {
    expect(pageRange(1, 1)).toEqual([1]);
    expect(pageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageRange(1, 0)).toEqual([]);
  });

  it('ko‘p sahifa — boshi, oxiri, atrofi', () => {
    expect(pageRange(1, 20)).toEqual([1, 2, '…', 20]);
    expect(pageRange(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(pageRange(20, 20)).toEqual([1, '…', 19, 20]);
    expect(pageRange(3, 20)).toEqual([1, 2, 3, 4, '…', 20]);
  });

  it('chegaradan tashqari sahifa qisqartiriladi', () => {
    expect(pageRange(99, 20)).toEqual([1, '…', 19, 20]);
  });
});
