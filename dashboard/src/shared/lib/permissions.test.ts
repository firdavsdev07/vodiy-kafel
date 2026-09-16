import { describe, expect, it } from 'vitest';
import { can, hasRole, PERMISSIONS, rolesForAny, STAFF_ROLES } from './permissions';

describe('permissions (D-007)', () => {
  it('backenddagi @Roles bilan mos — asosiy nuqtalar', () => {
    const matrix: [keyof typeof PERMISSIONS, string[]][] = [
      ['catalog.write', ['SUPER_ADMIN']],
      ['stock.write', ['MODERATOR', 'SUPER_ADMIN']],
      ['prices.write', ['BRANCH_ADMIN', 'SUPER_ADMIN']],
      ['pricingRules.manage', ['BRANCH_ADMIN', 'SUPER_ADMIN']],
      ['supplyOrders.review', ['MODERATOR', 'SUPER_ADMIN']],
      ['supplyOrders.create', ['BRANCH_ADMIN', 'MANAGER']],
      ['managers.manage', ['BRANCH_ADMIN', 'SUPER_ADMIN']],
      ['moderators.manage', ['SUPER_ADMIN']],
      ['settings.view', ['BRANCH_ADMIN', 'SUPER_ADMIN']],
      ['settings.write', ['SUPER_ADMIN']],
      ['orders.assign', ['BRANCH_ADMIN', 'MODERATOR', 'SUPER_ADMIN']],
    ];
    for (const [permission, roles] of matrix) {
      expect([...PERMISSIONS[permission]].sort(), permission).toEqual(roles);
    }
  });

  it('har ruxsatda kamida bitta rol, dublikat yo‘q', () => {
    for (const [permission, roles] of Object.entries(PERMISSIONS)) {
      expect(roles.length, permission).toBeGreaterThan(0);
      expect(new Set(roles).size, permission).toBe(roles.length);
    }
  });

  it('SUPER_ADMIN — filial tomonidan ta’minot buyurtmasi BERMAYDI, qolgan hammasi bor', () => {
    const denied = Object.keys(PERMISSIONS).filter(
      (p) => !can('SUPER_ADMIN', p as keyof typeof PERMISSIONS),
    );
    expect(denied).toEqual(['supplyOrders.create']);
  });

  it('can: rol noma’lum → yo‘q', () => {
    expect(can(undefined, 'catalog.view')).toBe(false);
    expect(can(null, 'catalog.view')).toBe(false);
    expect(can('MANAGER', 'catalog.view')).toBe(true);
    expect(can('MANAGER', 'catalog.write')).toBe(false);
    expect(hasRole(undefined, STAFF_ROLES)).toBe(false);
  });

  it('rolesForAny — ruxsatlar birlashmasi, tartib STAFF_ROLES bo‘yicha', () => {
    expect(rolesForAny('supplyOrders.review', 'supplyOrders.create')).toEqual(STAFF_ROLES);
    expect(rolesForAny('managers.manage', 'moderators.manage')).toEqual([
      'SUPER_ADMIN',
      'BRANCH_ADMIN',
    ]);
    expect(rolesForAny()).toEqual([]);
  });
});
