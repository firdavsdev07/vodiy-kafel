import { describe, expect, it } from 'vitest';
import type { StaffRole } from '@/shared/auth';
import { STAFF_ROLES } from '@/shared/lib/permissions';
import { documentTitle, NAV_GROUPS, NAV_SECTIONS, navGroupsForRole } from './navigation';

const pathsFor = (role: StaffRole) =>
  navGroupsForRole(role).flatMap((g) => g.sections.map((s) => s.path));

describe('navigatsiya (D-003)', () => {
  it('task.txt dagi barcha bo‘limlar bor', () => {
    expect(NAV_SECTIONS.map((s) => s.path).sort()).toEqual(
      [
        '/',
        '/announcements', // T-009
        '/branches',
        '/customers',
        '/delivery',
        '/factories',
        '/gallery',
        '/orders',
        '/partners',
        '/prices',
        '/products',
        '/settings',
        '/sizes',
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

describe('rolga qarab menyu (D-007)', () => {
  it('har bo‘limda kamida bitta rol; bosh sahifa — hammaga', () => {
    for (const section of NAV_SECTIONS) expect(section.roles.length, section.id).toBeGreaterThan(0);
    for (const role of STAFF_ROLES) expect(pathsFor(role)).toContain('/');
  });

  it('SUPER_ADMIN hamma bo‘limni ko‘radi', () => {
    expect(pathsFor('SUPER_ADMIN')).toEqual(NAV_SECTIONS.map((s) => s.path));
  });

  it('MANAGER: Xodimlar va Sozlamalar yo‘q', () => {
    const paths = pathsFor('MANAGER');
    expect(paths).not.toContain('/staff');
    expect(paths).not.toContain('/settings');
    expect(paths).toContain('/prices');
    expect(paths).toContain('/supply-orders');
  });

  it('MODERATOR: Narxlar, Xodimlar, Sozlamalar yo‘q', () => {
    const paths = pathsFor('MODERATOR');
    expect(paths).not.toContain('/prices');
    expect(paths).not.toContain('/staff');
    expect(paths).not.toContain('/settings');
    expect(paths).toContain('/stock');
  });

  it('BRANCH_ADMIN: Xodimlar va Sozlamalar bor', () => {
    const paths = pathsFor('BRANCH_ADMIN');
    expect(paths).toContain('/staff');
    expect(paths).toContain('/settings');
  });

  it('bo‘sh guruh menyuda qolmaydi, tartib saqlanadi', () => {
    for (const role of STAFF_ROLES) {
      const groups = navGroupsForRole(role);
      for (const g of groups) expect(g.sections.length).toBeGreaterThan(0);
      expect(groups.map((g) => g.title)).toEqual(
        NAV_GROUPS.filter((g) => g.sections.some((s) => s.roles.includes(role))).map((g) => g.title),
      );
    }
  });
});
