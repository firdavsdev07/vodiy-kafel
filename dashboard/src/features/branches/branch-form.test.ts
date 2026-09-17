import { describe, expect, it } from 'vitest';
import { branchDefaults, branchSchema, toCreateBranchBody, toUpdateBranchBody, type Branch, type BranchFormInput } from './branch-form';

const branch: Branch = {
  id: 'b1',
  name: 'Vodiy Kafel — Farg‘ona',
  city: 'Farg‘ona',
  address: 'Mustaqillik 12',
  latitude: 40.3864,
  longitude: 71.7864,
  workingHours: 'Du–Sh 09:00–18:00',
  phones: ['+998 73 244 00 00'],
  buildingImageUrl: null,
  telegramUrl: 'https://t.me/vk',
  instagramUrl: null,
  type: 'RETAIL',
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
const parse = (over: Partial<BranchFormInput> = {}) => branchSchema.safeParse({ ...branchDefaults(branch), ...over });

describe('filial formasi (D-033)', () => {
  it('koordinata SON bo‘lib ketadi; vergul ham qabul qilinadi; chegaradan tashqari — xato', () => {
    const r = parse({ latitude: '40,5', longitude: '-71.25' });
    expect(r.success && [r.data.latitude, r.data.longitude]).toEqual([40.5, -71.25]);
    expect(parse({ latitude: '91' }).success).toBe(false);
    expect(parse({ longitude: 'abc' }).success).toBe(false);
  });

  it('telefonlar: har qatorda bitta, bo‘sh qatorlar tashlanadi; 1…5 ta; format', () => {
    const r = parse({ phones: '+998 73 244 00 00\n\n +998 90 123 45 67 ' });
    expect(r.success && r.data.phones).toEqual(['+998 73 244 00 00', '+998 90 123 45 67']);
    expect(parse({ phones: ' \n ' }).success).toBe(false);
    expect(parse({ phones: Array(6).fill('+998901234567').join('\n') }).success).toBe(false);
    expect(parse({ phones: 'telefon' }).success).toBe(false);
  });

  it('havola faqat https; bo‘sh — mumkin', () => {
    expect(parse({ telegramUrl: 'http://t.me/x' }).success).toBe(false);
    expect(parse({ telegramUrl: '' }).success).toBe(true);
  });

  it('yaratish: bo‘sh havolalar yuborilmaydi', () => {
    const r = branchSchema.parse({ ...branchDefaults(), name: 'Yangi', city: 'Qo‘qon', address: 'A', latitude: '40.5', longitude: '70.9', workingHours: '9–18', phones: '+998901234567' });
    expect(toCreateBranchBody(r)).toEqual({
      type: 'RETAIL', name: 'Yangi', city: 'Qo‘qon', address: 'A', latitude: 40.5, longitude: 70.9, workingHours: '9–18', phones: ['+998901234567'], sortOrder: 0,
    });
  });

  it('tahrirlash: faqat o‘zgargan maydonlar; havola bo‘shatilsa null; type hech qachon', () => {
    const unchanged = branchSchema.parse(branchDefaults(branch));
    expect(toUpdateBranchBody(unchanged, branch, true)).toEqual({});
    const r = branchSchema.parse({ ...branchDefaults(branch), name: 'Yangi nom', telegramUrl: '', workingHours: '10–19' });
    expect(toUpdateBranchBody(r, branch, true)).toEqual({ name: 'Yangi nom', telegramUrl: null, workingHours: '10–19' });
  });

  it('🔒 filial admini: faqat kontakt maydonlari — nom o‘zgarsa ham yuborilmaydi (403 bo‘lmasin)', () => {
    const r = branchSchema.parse({ ...branchDefaults(branch), name: 'Buzish', sortOrder: '9', address: 'Yangi manzil' });
    expect(toUpdateBranchBody(r, branch, false)).toEqual({ address: 'Yangi manzil' });
  });
});
