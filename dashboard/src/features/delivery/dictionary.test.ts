import { describe, expect, it } from 'vitest';
import { dictionaryDefaults, dictionarySchema, nextSortOrder, toCreateDictionaryBody, toUpdateDictionaryBody, type DictionaryItem } from './dictionary';

const region: DictionaryItem = { id: 'r1', name: 'Farg‘ona', sortOrder: 1, isActive: true };
const fura: DictionaryItem = { id: 't1', name: 'Fura', sortOrder: 0, isActive: true, capacityPallets: 20 };

describe('yetkazib berish ma’lumotnomalari (D-037, D-038)', () => {
  it('viloyat: sig‘im so‘ralmaydi va yuborilmaydi', () => {
    const v = dictionarySchema({ nameMax: 100, withCapacity: false }).parse({ ...dictionaryDefaults(undefined, 5), name: ' Xorazm ' });
    expect(toCreateDictionaryBody(v)).toEqual({ name: 'Xorazm', sortOrder: 5 });
  });

  it('transport: sig‘im 1…1000 butun son', () => {
    const s = dictionarySchema({ nameMax: 60, withCapacity: true });
    for (const bad of ['', '0', '1001', '2.5', 'abc']) {
      expect(s.safeParse({ name: 'Kamaz', sortOrder: '0', capacityPallets: bad }).success).toBe(false);
    }
    expect(toCreateDictionaryBody(s.parse({ name: 'Kamaz', sortOrder: '2', capacityPallets: '12' }))).toEqual({ name: 'Kamaz', sortOrder: 2, capacityPallets: 12 });
  });

  it('tahrirlash: faqat o‘zgarganlar', () => {
    const rs = dictionarySchema({ nameMax: 100, withCapacity: false });
    expect(toUpdateDictionaryBody(rs.parse(dictionaryDefaults(region, 0)), region)).toEqual({});
    expect(toUpdateDictionaryBody(rs.parse({ ...dictionaryDefaults(region, 0), name: 'Farg‘ona viloyati' }), region)).toEqual({ name: 'Farg‘ona viloyati' });
    const ts = dictionarySchema({ nameMax: 60, withCapacity: true });
    expect(toUpdateDictionaryBody(ts.parse({ ...dictionaryDefaults(fura, 0), capacityPallets: '22' }), fura)).toEqual({ capacityPallets: 22 });
  });

  it('keyingi tartib raqami', () => {
    expect(nextSortOrder([region, fura])).toBe(2);
    expect(nextSortOrder(undefined)).toBe(0);
  });
});
