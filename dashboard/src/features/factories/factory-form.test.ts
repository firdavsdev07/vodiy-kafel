import { describe, expect, it } from 'vitest';
import { factoryDefaults, factorySchema, toCreateBody, toUpdateBody, type Factory } from './factory-form';

const factory: Factory = {
  id: 'f1',
  name: 'YONGXIN',
  slug: 'yongxin',
  logoUrl: '/uploads/factories/yongxin.png',
  description: null,
  websiteUrl: 'https://yongxin.example.com',
  sortOrder: 10,
  isActive: true,
  productCount: 12,
  createdAt: '2026-09-13T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

const parse = (over: Record<string, string> = {}) =>
  factorySchema.safeParse({ ...factoryDefaults(), name: 'Zavod', logoUrl: '/uploads/a.png', ...over });

describe('zavod formasi (D-009)', () => {
  it('backend chegaralari', () => {
    expect(parse().success).toBe(true);
    expect(parse({ name: '   ' }).success).toBe(false);
    expect(parse({ name: 'x'.repeat(121) }).success).toBe(false);
    expect(parse({ logoUrl: 'logo.png' }).success).toBe(false);
    expect(parse({ logoUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(parse({ logoUrl: 'https://cdn.x/a.png' }).success).toBe(true);
    expect(parse({ websiteUrl: 'yongxin' }).success).toBe(false);
    expect(parse({ websiteUrl: 'https://yongxin.cn' }).success).toBe(true);
    expect(parse({ sortOrder: '-1' }).success).toBe(false);
    expect(parse({ sortOrder: '1.5' }).success).toBe(false);
    expect(parse({ sortOrder: ' 7 ' }).data?.sortOrder).toBe(7);
  });

  it('yaratish: bo‘sh ixtiyoriy maydonlar yuborilmaydi', () => {
    const values = factorySchema.parse({ ...factoryDefaults(), name: ' Lyuks ', logoUrl: '/uploads/l.png' });
    expect(toCreateBody(values)).toEqual({ name: 'Lyuks', logoUrl: '/uploads/l.png', sortOrder: 0 });
  });

  it('tahrirlash: formani o‘zgartirmasdan saqlash — bo‘sh tana', () => {
    const values = factorySchema.parse(factoryDefaults(factory));
    expect(toUpdateBody(values, factory)).toEqual({});
  });

  it('tahrirlash: faqat o‘zgargan maydonlar', () => {
    const values = factorySchema.parse({
      ...factoryDefaults(factory),
      name: 'YONGXIN CERAMICS',
      description: 'Yirik ishlab chiqaruvchi',
      sortOrder: '3',
    });
    expect(toUpdateBody(values, factory)).toEqual({
      name: 'YONGXIN CERAMICS',
      description: 'Yirik ishlab chiqaruvchi',
      sortOrder: 3,
    });
  });

  it('tahrirlash: bo‘shatilgan sayt yuborilmaydi (backend null qabul qilmaydi)', () => {
    const values = factorySchema.parse({ ...factoryDefaults(factory), websiteUrl: '' });
    expect(toUpdateBody(values, factory)).toEqual({});
  });
});
