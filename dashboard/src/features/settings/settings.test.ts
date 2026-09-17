import { describe, expect, it } from 'vitest';
import { formatAccount, percentSchema, readNumber, readRequisites, requisitesDefaults, requisitesSchema, thresholdSchema } from './settings';

const req = { bank: 'Hamkorbank', mfo: '00873', account: '20208000900123456789', inn: '301234567', name: 'Vodiy Kafel Savdo MChJ' };

describe('sozlamalar (D-040)', () => {
  it('«kam qoldi» chegarasi: butun 0…1 000 000', () => {
    expect(thresholdSchema.parse({ value: ' 20 ' }).value).toBe(20);
    for (const bad of ['', '-1', '2.5', '1000001', 'yigirma']) expect(thresholdSchema.safeParse({ value: bad }).success).toBe(false);
  });

  it('chegirma chegarasi: 0…100, vergul ham', () => {
    expect(percentSchema.parse({ value: '7,5' }).value).toBe(7.5);
    expect(percentSchema.parse({ value: '0' }).value).toBe(0);
    for (const bad of ['101', '-5', 'abc', '10.123']) expect(percentSchema.safeParse({ value: bad }).success).toBe(false);
  });

  it('rekvizitlar: MFO 5, hisob 20, INN 9 raqam — aynan', () => {
    expect(requisitesSchema.safeParse(req).success).toBe(true);
    expect(requisitesSchema.safeParse({ ...req, mfo: '0087' }).success).toBe(false);
    expect(requisitesSchema.safeParse({ ...req, account: '2020800090012345678A' }).success).toBe(false);
    expect(requisitesSchema.safeParse({ ...req, inn: '3012345678' }).success).toBe(false);
    expect(requisitesSchema.safeParse({ ...req, bank: ' ' }).success).toBe(false);
  });

  it('API qiymatini o‘qish taxmin qilmaydi', () => {
    expect(readNumber(20)).toBe(20);
    expect(readNumber('20')).toBeNull();
    expect(readRequisites(req)).toEqual(req);
    expect(readRequisites(null)).toBeNull();
    expect(readRequisites({ bank: 'x' })).toBeNull();
    expect(requisitesDefaults(null)).toEqual({ bank: '', mfo: '', account: '', inn: '', name: '' });
  });

  it('hisob raqam ko‘rinishi', () => {
    expect(formatAccount('20208000900123456789')).toBe('20208 00090 01234 56789');
  });
});
