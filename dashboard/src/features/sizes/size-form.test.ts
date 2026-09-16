import { describe, expect, it } from 'vitest';
import { changesDimensions, previewLabel, sizeDefaults, sizeSchema, toUpdateBody, type Size } from './size-form';

const size: Size = {
  id: 's1',
  label: '60x60',
  widthCm: 60,
  heightCm: 60,
  sortOrder: 1,
  productCount: 5,
  createdAt: '2026-09-13T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

describe('o‘lcham formasi (D-010)', () => {
  it('backend chegaralari: butun, 1–1000 sm', () => {
    const ok = (w: string, h = '60') => sizeSchema.safeParse({ widthCm: w, heightCm: h, sortOrder: '0' }).success;
    expect(ok('1')).toBe(true);
    expect(ok('1000')).toBe(true);
    expect(ok('0')).toBe(false);
    expect(ok('1001')).toBe(false);
    expect(ok('60.5')).toBe(false);
    expect(ok('')).toBe(false);
    expect(ok('-5')).toBe(false);
    expect(sizeSchema.parse({ widthCm: ' 30 ', heightCm: '060', sortOrder: '2' })).toEqual({
      widthCm: 30,
      heightCm: 60,
      sortOrder: 2,
    });
  });

  it('yozuvni oldindan ko‘rsatish (backend bilan bir xil ko‘rinish)', () => {
    expect(previewLabel('60', '120')).toBe('60x120');
    expect(previewLabel('060', ' 60')).toBe('60x60');
    expect(previewLabel('60', '')).toBeNull();
  });

  it('tahrir: faqat o‘zgargan maydonlar; tartib — o‘lcham o‘zgarishi emas', () => {
    const same = sizeSchema.parse(sizeDefaults(size));
    expect(toUpdateBody(same, size)).toEqual({});

    const order = toUpdateBody(sizeSchema.parse({ ...sizeDefaults(size), sortOrder: '4' }), size);
    expect(order).toEqual({ sortOrder: 4 });
    expect(changesDimensions(order)).toBe(false);

    const dims = toUpdateBody(sizeSchema.parse({ ...sizeDefaults(size), heightCm: '120' }), size);
    expect(dims).toEqual({ heightCm: 120 });
    expect(changesDimensions(dims)).toBe(true);
  });
});
