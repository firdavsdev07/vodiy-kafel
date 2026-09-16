import { describe, expect, it } from 'vitest';
import { galleryDefaults, galleryMetaSchema, toCreateFields, toUpdateBody, type GalleryItem } from './gallery-form';

const item: GalleryItem = {
  id: 'g1',
  imageUrl: '/uploads/gallery/g1.jpg',
  title: 'Toshkent, oshxona',
  product: { id: 'p1', name: 'Marmar', slug: 'marmar', isActive: true },
  sortOrder: 2,
  isActive: true,
  createdAt: '2026-09-13T10:00:00.000Z',
  updatedAt: '2026-09-13T10:00:00.000Z',
};

describe('galereya formasi (D-015)', () => {
  it('chegaralar', () => {
    const ok = (over: object) => galleryMetaSchema.safeParse({ ...galleryDefaults(), ...over }).success;
    expect(ok({})).toBe(true);
    expect(ok({ title: 'x'.repeat(201) })).toBe(false);
    expect(ok({ sortOrder: '-1' })).toBe(false);
  });

  it('yaratish: multipart maydonlari', () => {
    const values = galleryMetaSchema.parse({ ...galleryDefaults(), title: '  ', sortOrder: '3' });
    expect(toCreateFields(values)).toEqual({ sortOrder: '3' });
    const withProduct = galleryMetaSchema.parse({ ...galleryDefaults(item) });
    expect(toCreateFields(withProduct)).toEqual({ title: 'Toshkent, oshxona', productId: 'p1', sortOrder: '2' });
  });

  it('tahrir: o‘zgarmasa bo‘sh; tozalash — null', () => {
    expect(toUpdateBody(galleryMetaSchema.parse(galleryDefaults(item)), item)).toEqual({});
    const cleared = galleryMetaSchema.parse({ ...galleryDefaults(item), title: '', product: null, isActive: false });
    expect(toUpdateBody(cleared, item)).toEqual({ title: null, productId: null, isActive: false });
  });
});
