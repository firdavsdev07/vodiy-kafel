import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import { productListConfig, toProductsQuery } from './list';

const fromUrl = (qs: string) => toProductsQuery(parseListParams(new URLSearchParams(qs), productListConfig));

describe('mahsulotlar ro‘yxati → API query (D-011)', () => {
  it('standart: faqat sahifa', () => {
    expect(fromUrl('')).toEqual({ page: 1, limit: 20 });
  });

  it('barcha filtrlar turga keltiriladi', () => {
    expect(
      fromUrl('page=2&limit=50&sortBy=viewCount&sortOrder=desc&search=kafel&factoryId=f1&sizeId=s1&surface=POL&isActive=false'),
    ).toEqual({
      page: 2,
      limit: 50,
      sortBy: 'viewCount',
      sortOrder: 'desc',
      search: 'kafel',
      factoryId: 'f1',
      sizeId: 's1',
      surface: 'POL',
      isActive: false,
    });
  });

  it('⚠ narx bo‘yicha saralash va buzilgan qiymatlar backendga ketmaydi', () => {
    expect(fromUrl('sortBy=price&surface=SHIFT&isActive=yes')).toEqual({ page: 1, limit: 20 });
  });
});
