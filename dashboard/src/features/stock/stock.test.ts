import { describe, expect, it } from 'vitest';
import { palletDelta, parsePallets, toStockBody, type StockRow } from './stock';

const row: StockRow = {
  stockPallets: 12,
  lowStockThreshold: null,
  effectiveThreshold: 5,
  stockStatus: 'IN_STOCK',
  product: { id: 'p1', name: 'Marmar', slug: 'marmar', isActive: true },
  updatedAt: null,
};

describe('zaxira (D-018)', () => {
  it('paddon soni', () => {
    expect(parsePallets('25')).toEqual({ value: 25 });
    expect(parsePallets(' 1 200 ')).toEqual({ value: 1200 });
    expect(parsePallets('0')).toEqual({ value: 0 });
    expect(parsePallets('')).toEqual({ error: 'Sonni kiriting' });
    expect(parsePallets('-3')).toHaveProperty('error');
    expect(parsePallets('2.5')).toHaveProperty('error');
    expect(parsePallets('9999999999')).toEqual({ error: 'Juda katta son' });
  });

  it('PUT tanasi: yangi son (farq emas); chegara — yubormaslik / null / son', () => {
    expect(toStockBody(row, { stockPallets: 3 })).toEqual({ productId: 'p1', stockPallets: 3 });
    expect(toStockBody(row, { threshold: 'global' })).toEqual({ productId: 'p1', stockPallets: 12, lowStockThreshold: null });
    expect(toStockBody(row, { threshold: 8 })).toEqual({ productId: 'p1', stockPallets: 12, lowStockThreshold: 8 });
  });

  it('farq matni', () => {
    expect(palletDelta(12, 20)).toBe('+8 paddon');
    expect(palletDelta(12, 2)).toBe('-10 paddon');
    expect(palletDelta(5, 5)).toBe('o‘zgarmaydi');
  });
});
