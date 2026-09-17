import { describe, expect, it } from 'vitest';
import { assignOptions, type AssignableStaff } from './assign';

const staff: AssignableStaff[] = [
  { id: 'b1', fullName: 'Admin Aliyev', role: 'BRANCH_ADMIN', telegramUsername: null },
  { id: 'm1', fullName: 'Ali', role: 'MANAGER', telegramUsername: 'vk_ali' },
];

describe('xodim biriktirish (D-027, api B-062)', () => {
  it('nomzodlar backenddan — rol yorliqda ko‘rinadi', () => {
    expect(assignOptions({ staff, me: undefined, current: null })).toEqual([
      { value: 'b1', label: 'Admin Aliyev — Filial administratori' },
      { value: 'm1', label: 'Ali — Menejer' },
    ]);
  });

  it('o‘zi ro‘yxatda bo‘lsa — "(men)" bilan belgilanadi', () => {
    const options = assignOptions({ staff, me: { id: 'm1' }, current: null });
    expect(options[1]?.label).toBe('Ali — Menejer (men)');
  });

  it('ro‘yxat hali kelmagan — bo‘sh, lekin yiqilmaydi', () => {
    expect(assignOptions({ staff: undefined, me: undefined, current: null })).toEqual([]);
  });

  it('ro‘yxatda yo‘q hozirgi xodim yo‘qolmaydi (masalan faolsizlantirilgan)', () => {
    const options = assignOptions({ staff, me: undefined, current: { id: 'old', fullName: 'Eski' } });
    expect(options[0]).toEqual({ value: 'old', label: 'Eski (hozirgi)' });
    expect(options).toHaveLength(3);
    // Ro'yxatda bor bo'lsa — takrorlanmaydi
    expect(assignOptions({ staff, me: undefined, current: { id: 'm1', fullName: 'Ali' } })).toHaveLength(2);
  });
});
