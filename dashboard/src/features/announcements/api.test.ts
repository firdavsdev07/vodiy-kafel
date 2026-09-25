import { describe, expect, it } from 'vitest';
import { toAnnouncementFormData } from './api';

const base = { title: '', body: '  Bayram muborak  ', audience: 'ALL' as const, customerIds: [], image: null };

describe('toAnnouncementFormData (T-009)', () => {
  it('barchasiga: customerIds va bo‘sh sarlavha yuborilmaydi, matn tozalanadi', () => {
    const form = toAnnouncementFormData(base);
    expect(form.get('body')).toBe('Bayram muborak');
    expect(form.get('audience')).toBe('ALL');
    expect(form.has('title')).toBe(false);
    expect(form.has('customerIds')).toBe(false);
    expect(form.has('image')).toBe(false);
  });

  it('tanlanganlarga: ID lar JSON massiv; rasm va sarlavha qo‘shiladi', () => {
    const image = new File(['x'], 'b.png', { type: 'image/png' });
    const form = toAnnouncementFormData({
      ...base,
      title: ' Navro‘z ',
      audience: 'SELECTED',
      customerIds: ['c1', 'c2'],
      image,
    });
    expect(form.get('title')).toBe('Navro‘z');
    expect(JSON.parse(String(form.get('customerIds')))).toEqual(['c1', 'c2']);
    expect((form.get('image') as File).name).toBe('b.png');
  });
});
