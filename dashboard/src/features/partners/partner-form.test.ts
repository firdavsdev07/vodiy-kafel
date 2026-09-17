import { describe, expect, it } from 'vitest';
import { partnerDefaults, partnerSchema, reorderPatches, toCreatePartnerFields, toUpdatePartnerBody, type Partner } from './partner-form';

const p = (id: string, sortOrder: number, over: Partial<Partner> = {}): Partner => ({
  id,
  name: `Hamkor ${id}`,
  logoUrl: `/uploads/partners/${id}.png`,
  websiteUrl: null,
  sortOrder,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...over,
});

describe('hamkorlar (D-034)', () => {
  it('yaratish: bo‘sh sayt yuborilmaydi, tartib satr (multipart)', () => {
    const v = partnerSchema.parse({ ...partnerDefaults(undefined, 3), name: ' Knauf ' });
    expect(toCreatePartnerFields(v)).toEqual({ name: 'Knauf', sortOrder: '3' });
  });

  it('sayt: http(s) to‘liq havola; noto‘g‘ri — xato', () => {
    expect(partnerSchema.safeParse({ ...partnerDefaults(), name: 'X', websiteUrl: 'knauf.uz' }).success).toBe(false);
    expect(partnerSchema.safeParse({ ...partnerDefaults(), name: 'X', websiteUrl: 'http://knauf.uz' }).success).toBe(true);
  });

  it('tahrirlash: faqat o‘zgarganlar; sayt bo‘shatilsa null', () => {
    const partner = p('a', 0, { websiteUrl: 'https://knauf.uz' });
    expect(toUpdatePartnerBody(partnerSchema.parse(partnerDefaults(partner)), partner)).toEqual({});
    const v = partnerSchema.parse({ ...partnerDefaults(partner), websiteUrl: '', isActive: false });
    expect(toUpdatePartnerBody(v, partner)).toEqual({ websiteUrl: null, isActive: false });
  });

  it('tartib: faqat o‘zgargan joylar PATCH qilinadi; chegarada hech narsa', () => {
    const list = [p('a', 0), p('b', 1), p('c', 2)];
    expect(reorderPatches(list, 2, -1)).toEqual([
      { id: 'c', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ]);
    expect(reorderPatches(list, 0, -1)).toEqual([]);
    expect(reorderPatches(list, 2, 1)).toEqual([]);
  });

  it('tartib: takroriy / bo‘shliqli raqamlar 0,1,2… ga tekislanadi', () => {
    const list = [p('a', 5), p('b', 5), p('c', 9)];
    expect(reorderPatches(list, 0, 1)).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
      { id: 'c', sortOrder: 2 },
    ]);
  });
});
