import { describe, expect, it } from 'vitest';
import { assignOptions } from './assign';

const managers = [
  { id: 'm1', fullName: 'Ali' },
  { id: 'm2', fullName: 'Vali' },
];

describe('xodim biriktirish (D-027)', () => {
  it('SUPER_ADMIN / BRANCH_ADMIN — filial menejerlari', () => {
    expect(assignOptions({ role: 'BRANCH_ADMIN', me: { id: 'u1', fullName: 'Admin' }, managers, current: null })).toEqual([
      { value: 'm1', label: 'Ali' },
      { value: 'm2', label: 'Vali' },
    ]);
  });

  it('MODERATOR — menejerlar ro‘yxati yopiq, faqat o‘zi', () => {
    expect(assignOptions({ role: 'MODERATOR', me: { id: 'mod', fullName: 'Moderator' }, managers, current: null })).toEqual([
      { value: 'mod', label: 'Moderator (men)' },
    ]);
  });

  it('ro‘yxatda yo‘q hozirgi xodim yo‘qolmaydi', () => {
    const opts = assignOptions({ role: 'SUPER_ADMIN', me: undefined, managers, current: { id: 'old', fullName: 'Eski' } });
    expect(opts[0]).toEqual({ value: 'old', label: 'Eski (hozirgi)' });
    expect(assignOptions({ role: 'SUPER_ADMIN', me: undefined, managers, current: { id: 'm1', fullName: 'Ali' } })).toHaveLength(2);
  });
});
