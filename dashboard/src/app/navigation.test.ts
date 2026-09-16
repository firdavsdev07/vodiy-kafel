import { describe, expect, it } from 'vitest';
import { documentTitle, NAV_GROUPS, NAV_SECTIONS } from './navigation';

describe('navigatsiya (D-003)', () => {
  it('task.txt dagi barcha bo‘limlar bor', () => {
    expect(NAV_SECTIONS.map((s) => s.path).sort()).toEqual(
      [
        '/',
        '/branches',
        '/customers',
        '/delivery',
        '/orders',
        '/partners',
        '/prices',
        '/products',
        '/settings',
        '/staff',
        '/stock',
        '/supply-orders',
      ].sort(),
    );
  });

  it('yo‘l va id noyob, sarlavha bo‘sh emas', () => {
    expect(new Set(NAV_SECTIONS.map((s) => s.path)).size).toBe(NAV_SECTIONS.length);
    expect(new Set(NAV_SECTIONS.map((s) => s.id)).size).toBe(NAV_SECTIONS.length);
    for (const section of NAV_SECTIONS) expect(section.title.trim()).not.toBe('');
    for (const group of NAV_GROUPS) expect(group.sections.length).toBeGreaterThan(0);
  });

  it('sahifa sarlavhasi', () => {
    expect(documentTitle('Buyurtmalar')).toBe('Buyurtmalar — Vodiy Kafel');
    expect(documentTitle()).toBe('Vodiy Kafel — boshqaruv paneli');
  });
});
