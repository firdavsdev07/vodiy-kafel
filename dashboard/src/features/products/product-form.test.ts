import { describe, expect, it } from 'vitest';
import {
  changesCalculation,
  productDefaults,
  productSchema,
  toCreateBody,
  toUpdateBody,
  type Product,
} from './product-form';

const product: Product = {
  id: 'p1',
  name: 'Marmar 100',
  slug: 'marmar-100-60x60',
  factory: { id: 'fa', name: 'YONGXIN', slug: 'yongxin' },
  size: { id: 'sa', label: '60x60', widthCm: 60, heightCm: 60 },
  surface: 'POL',
  color: null,
  description: 'Yaltiroq',
  sqmPerPallet: '43.2000',
  weightPerPallet: '980.500',
  viewCount: 5,
  isActive: true,
  stock: { stockPallets: 3, lowStockThreshold: null, effectiveThreshold: 5, stockStatus: 'LOW' },
  createdAt: '2026-09-13T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

const valid = { ...productDefaults(product) };

describe('mahsulot formasi (D-012)', () => {
  it('backend chegaralari: m² (6,4), kg (7,3), majburiy tanlovlar', () => {
    const ok = (over: Record<string, string>) => productSchema.safeParse({ ...valid, ...over }).success;
    expect(ok({})).toBe(true);
    expect(ok({ sqmPerPallet: '1.4444' })).toBe(true);
    expect(ok({ sqmPerPallet: '1.44444' })).toBe(false);
    expect(ok({ sqmPerPallet: '1234567' })).toBe(false);
    expect(ok({ sqmPerPallet: '0' })).toBe(false);
    expect(ok({ weightPerPallet: '1250.555' })).toBe(true);
    expect(ok({ weightPerPallet: '1250.5555' })).toBe(false);
    expect(ok({ factoryId: '' })).toBe(false);
    expect(ok({ surface: '' })).toBe(false);
    expect(ok({ color: 'x'.repeat(61) })).toBe(false);
  });

  it('yangi forma bo‘sh; yaratish tanasida bo‘sh ixtiyoriylar yo‘q', () => {
    expect(productDefaults()).toMatchObject({ name: '', sqmPerPallet: '', surface: '' });
    const values = productSchema.parse({ ...valid, color: '', description: '' });
    expect(toCreateBody(values)).toEqual({
      name: 'Marmar 100',
      factoryId: 'fa',
      sizeId: 'sa',
      surface: 'POL',
      sqmPerPallet: '43.2',
      weightPerPallet: '980.5',
    });
  });

  it('tahrir: API "43.2000" formada "43.2" — o‘zgarmagan deb hisoblanadi', () => {
    expect(productDefaults(product).sqmPerPallet).toBe('43.2');
    expect(toUpdateBody(productSchema.parse(valid), product)).toEqual({});
    expect(changesCalculation(valid, product)).toBe(false);
  });

  it('tahrir: faqat o‘zgarganlar; kalkulyator ogohlantirishi', () => {
    const input = { ...valid, sizeId: 'sb', sqmPerPallet: '43.25', color: 'Bej' };
    expect(toUpdateBody(productSchema.parse(input), product)).toEqual({
      sizeId: 'sb',
      sqmPerPallet: '43.25',
      color: 'Bej',
    });
    expect(changesCalculation(input, product)).toBe(true);
    // Yozish davomidagi chala qiymat ("43.") ogohlantirish chiqarmaydi
    expect(changesCalculation({ ...valid, sqmPerPallet: '43.' }, product)).toBe(false);
  });
});
