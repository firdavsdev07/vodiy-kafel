import { describe, expect, it } from 'vitest';
import { staffDefaults, staffSchema, telegramHref, toCreateStaffBody, toStaffQuery, toUpdateStaffBody, type Staff } from './staff-form';

const staff: Staff = {
  id: 's1',
  fullName: 'Farg‘ona menejeri',
  phone: '+998900220001',
  telegramUsername: 'vk_fargona',
  role: 'MANAGER',
  branch: { id: 'b1', name: 'Farg‘ona' },
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('xodim formasi (D-035)', () => {
  it('🔒 filial admini: branchId so‘ralmaydi va yuborilmaydi; @ olib tashlanadi', () => {
    const v = staffSchema({ branchRequired: false }).parse({ fullName: ' Ali ', phone: '90 123 45 67', telegramUsername: '@ali_vk', branchId: '' });
    expect(toCreateStaffBody(v)).toEqual({ fullName: 'Ali', phone: '+998901234567', telegramUsername: 'ali_vk' });
  });

  it('SUPER_ADMIN: filial majburiy va yuboriladi', () => {
    expect(staffSchema({ branchRequired: true }).safeParse({ fullName: 'Ali', phone: '901234567', telegramUsername: '', branchId: '' }).success).toBe(false);
    const v = staffSchema({ branchRequired: true }).parse({ fullName: 'Ali', phone: '901234567', telegramUsername: '', branchId: 'b2' });
    expect(toCreateStaffBody(v)).toEqual({ fullName: 'Ali', phone: '+998901234567', branchId: 'b2' });
  });

  it('telegram: 5–32 lotin harf/raqam/_', () => {
    const s = staffSchema({ branchRequired: false });
    expect(s.safeParse({ fullName: 'A', phone: '901234567', telegramUsername: 'abc', branchId: '' }).success).toBe(false);
    expect(s.safeParse({ fullName: 'A', phone: '901234567', telegramUsername: 'ali-vk', branchId: '' }).success).toBe(false);
  });

  it('tahrirlash: o‘zgarmagan → bo‘sh; telegram bo‘shatilsa null; filial faqat ruxsat bo‘lsa', () => {
    const s = staffSchema({ branchRequired: true });
    expect(toUpdateStaffBody(s.parse(staffDefaults(staff)), staff, true)).toEqual({});
    const v = s.parse({ ...staffDefaults(staff), telegramUsername: '', branchId: 'b2' });
    expect(toUpdateStaffBody(v, staff, true)).toEqual({ telegramUsername: null, branchId: 'b2' });
    expect(toUpdateStaffBody(v, staff, false)).toEqual({ telegramUsername: null });
  });

  it('yordamchilar: telegram havolasi, filtr so‘rovi', () => {
    expect(telegramHref('@vk_fargona')).toBe('https://t.me/vk_fargona');
    expect(toStaffQuery({ search: 'ali', isActive: 'false', branchId: '' })).toEqual({ search: 'ali', isActive: false });
  });
});
