import { describe, expect, it } from 'vitest';
import type { ProductRef } from '@/features/products/similar';
import { duplicateReason, supplyOrderDefaults, supplyOrderSchema, toCreateSupplyBody, type SupplyOrderInput } from './create';

const product = (id: string) => ({ id, name: `Mahsulot ${id}` }) as ProductRef;
const base: SupplyOrderInput = { ...supplyOrderDefaults, items: [{ product: product('p1'), pallets: '5' }] };
const parse = (over: Partial<SupplyOrderInput>, centralCount = 1) =>
  supplyOrderSchema({ centralCount }).safeParse({ ...base, ...over });

describe('filial ta’minot buyurtmasi (D-032)', () => {
  it('olib ketish: viloyat/transport va markaziy ombor yuborilmaydi, narx HECH QACHON', () => {
    const r = parse({ regionId: 'r1', transportTypeId: 't1', note: '  ' });
    expect(r.success && toCreateSupplyBody(r.data)).toEqual({ items: [{ productId: 'p1', pallets: 5 }] });
  });

  it('yetkazib berish: viloyat va transport ikkalasi majburiy va yuboriladi', () => {
    expect(parse({ delivery: 'DELIVERY', regionId: 'r1' }).success).toBe(false);
    const r = parse({ delivery: 'DELIVERY', regionId: 'r1', transportTypeId: 't1', note: ' Tez ' });
    expect(r.success && toCreateSupplyBody(r.data)).toEqual({
      items: [{ productId: 'p1', pallets: 5 }],
      regionId: 'r1',
      transportTypeId: 't1',
      note: 'Tez',
    });
  });

  it('markaziy omborlar bir nechta bo‘lsa — tanlash majburiy', () => {
    expect(parse({}, 2).success).toBe(false);
    const r = parse({ centralBranchId: 'c2' }, 2);
    expect(r.success && toCreateSupplyBody(r.data).centralBranchId).toBe('c2');
  });

  it('paddon: butun, 1…100 000; bo‘sh ro‘yxat — xato', () => {
    for (const bad of ['0', '', '1.5', '-2', '100001', 'abc']) {
      expect(parse({ items: [{ product: product('p1'), pallets: bad }] }).success).toBe(false);
    }
    expect(parse({ items: [{ product: product('p1'), pallets: '100000' }] }).success).toBe(true);
    expect(parse({ items: [] }).success).toBe(false);
  });

  it('bir mahsulot ikki marta qo‘shilmaydi', () => {
    expect(duplicateReason(base.items, product('p1'))).toBe('Qo‘shilgan');
    expect(duplicateReason(base.items, product('p2'))).toBeNull();
  });
});
