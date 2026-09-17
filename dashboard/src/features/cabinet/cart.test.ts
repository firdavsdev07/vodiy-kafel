import { describe, expect, it } from 'vitest';
import {
  addLine,
  clampPallets,
  MAX_CART_LINES,
  MAX_PALLETS,
  parseCart,
  removeLine,
  setPallets,
  totalPallets,
  toQuoteItems,
  type CartLine,
} from './cart';

const line = (productId: string, pallets = 1): CartLine => ({
  productId,
  slug: `${productId}-slug`,
  name: `Mahsulot ${productId}`,
  pallets,
});

describe('savat (D-053)', () => {
  describe('parseCart', () => {
    it('bo‘sh yoki buzilgan ma’lumot — bo‘sh savat', () => {
      expect(parseCart(null)).toEqual([]);
      expect(parseCart('')).toEqual([]);
      expect(parseCart('{')).toEqual([]);
      expect(parseCart('{"productId":"p1"}')).toEqual([]);
    });

    it('yaroqsiz QATOR tashlanadi, qolgani saqlanadi', () => {
      const raw = JSON.stringify([
        line('p1', 3),
        { productId: 'p2', slug: 's', name: 'n', pallets: 0 }, // 0 — chegaradan tashqari
        { productId: '', slug: 's', name: 'n', pallets: 2 },
        { productId: 'p3', slug: 's', name: 'n', pallets: 1.5 }, // butun son emas
        line('p4', 2),
      ]);
      expect(parseCart(raw).map((item) => item.productId)).toEqual(['p1', 'p4']);
    });

    it('bir mahsulot ikki marta yozilgan bo‘lsa — bittasi qoladi', () => {
      const raw = JSON.stringify([line('p1', 3), line('p1', 5)]);
      expect(parseCart(raw)).toEqual([line('p1', 3)]);
    });

    it('50 qatordan ortig‘i kesiladi', () => {
      const raw = JSON.stringify(
        Array.from({ length: 60 }, (_, index) => line(`p${index}`)),
      );
      expect(parseCart(raw)).toHaveLength(MAX_CART_LINES);
    });
  });

  describe('qo‘shish', () => {
    it('mavjud mahsulotga paddon QO‘SHILADI, yangi qator yaratilmaydi', () => {
      const result = addLine([line('p1', 3)], { ...line('p1'), pallets: 4 });
      expect(result.lines).toEqual([line('p1', 7)]);
      expect(result.error).toBeUndefined();
    });

    it('paddon chegarasidan oshsa — chegarada qoladi va xato aytiladi', () => {
      const result = addLine([line('p1', MAX_PALLETS)], { ...line('p1'), pallets: 10 });
      expect(result.lines[0]?.pallets).toBe(MAX_PALLETS);
      expect(result.error).toBe('pallets');
    });

    it('savat to‘lgan bo‘lsa — yangi mahsulot qo‘shilmaydi va xato aytiladi', () => {
      const full = Array.from({ length: MAX_CART_LINES }, (_, index) => line(`p${index}`));
      const result = addLine(full, line('yangi'));
      expect(result.lines).toHaveLength(MAX_CART_LINES);
      expect(result.error).toBe('lines');
    });
  });

  it('clampPallets — 1 … 100 000, butun son', () => {
    expect(clampPallets(0)).toBe(1);
    expect(clampPallets(-5)).toBe(1);
    expect(clampPallets(2.7)).toBe(2);
    expect(clampPallets(Number.NaN)).toBe(1);
    expect(clampPallets(MAX_PALLETS + 1)).toBe(MAX_PALLETS);
  });

  it('setPallets / removeLine / totalPallets', () => {
    const lines = [line('p1', 2), line('p2', 3)];
    expect(setPallets(lines, 'p2', 10)).toEqual([line('p1', 2), line('p2', 10)]);
    expect(setPallets(lines, 'p2', 0)).toEqual([line('p1', 2), line('p2', 1)]);
    expect(removeLine(lines, 'p1')).toEqual([line('p2', 3)]);
    expect(totalPallets(lines)).toBe(5);
  });

  /**
   * 🔒 CLAUDE.md qoida 1: frontend narx yubormaydi. So'rov tanasida
   * FAQAT `productId` va `pallets` bo'lishi shu test bilan qulflangan.
   */
  it('🔒 so‘rovga faqat productId va pallets ketadi', () => {
    expect(toQuoteItems([line('p1', 4)])).toEqual([{ productId: 'p1', pallets: 4 }]);
  });
});
