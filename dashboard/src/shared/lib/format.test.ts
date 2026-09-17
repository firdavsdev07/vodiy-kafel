import { describe, expect, it } from 'vitest';
import {
  balanceKind,
  formatDate,
  formatMoney,
  formatMoneyInput,
  formatUzPhone,
  normalizeDecimal,
  parseMoneyInput,
} from './format';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('formatMoney (G6)', () => {
  it('satrdan guruhlaydi, nol tiyinlar tashlanadi', () => {
    expect(nb(formatMoney('85000.00'))).toBe('85 000 so‘m');
    expect(nb(formatMoney('1234567.5'))).toBe('1 234 567,50 so‘m');
    expect(nb(formatMoney('999'))).toBe('999 so‘m');
    expect(nb(formatMoney('0.00'))).toBe('0 so‘m');
    expect(nb(formatMoney('-15000.25', { currency: false }))).toBe('−15 000,25');
  });

  it('katta summa float xatosisiz', () => {
    // Number('12345678901234567.89') → 12345678901234568 bo'lardi
    expect(nb(formatMoney('12345678901234567.89', { currency: false }))).toBe(
      '12 345 678 901 234 567,89',
    );
  });

  it('noto‘g‘ri qiymat yashirilmaydi', () => {
    expect(formatMoney('abc')).toBe('abc');
  });
});

describe('formatDate (G9)', () => {
  it('UTC → Asia/Tashkent (+05:00)', () => {
    expect(formatDate('2026-09-17T09:05:00.000Z')).toBe('17.09.2026 14:05');
    expect(formatDate('2026-09-17T21:30:00Z', 'date')).toBe('18.09.2026');
    expect(formatDate('2026-09-17T21:30:00Z', 'time')).toBe('02:30');
  });

  it('noto‘g‘ri sana → —', () => {
    expect(formatDate('nope')).toBe('—');
  });
});

describe('pul inputi', () => {
  it('parse: vergul, bo‘shliq, ortiqcha belgilar', () => {
    expect(parseMoneyInput('85 000,5')).toBe('85000.5');
    expect(parseMoneyInput('1.234.56')).toBe('1.23');
    expect(parseMoneyInput('00012')).toBe('12');
    expect(parseMoneyInput(',5')).toBe('0.5');
    expect(parseMoneyInput('12a3')).toBe('123');
    expect(parseMoneyInput('')).toBe('');
    expect(parseMoneyInput('100.')).toBe('100.');
  });

  it('format: yozish davomida nuqta saqlanadi', () => {
    expect(formatMoneyInput('85000.5')).toBe('85 000,5');
    expect(formatMoneyInput('100.')).toBe('100,');
    expect(formatMoneyInput('')).toBe('');
  });

  it('aylanma: format → parse qiymatni o‘zgartirmaydi', () => {
    for (const v of ['1', '85000', '1234567.89', '0.5', '100.']) {
      expect(parseMoneyInput(formatMoneyInput(v))).toBe(v);
    }
  });
});

describe('normalizeDecimal', () => {
  it('solishtirish uchun ko‘rinish', () => {
    expect(normalizeDecimal('43.2000')).toBe('43.2');
    expect(normalizeDecimal('007.50')).toBe('7.5');
    expect(normalizeDecimal('980.000')).toBe('980');
    expect(normalizeDecimal('0.0')).toBe('0');
  });
});

describe('telefon va balans', () => {
  it('formatUzPhone', () => {
    expect(formatUzPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(formatUzPhone('123')).toBe('123');
  });

  it('balanceKind — satr ustida', () => {
    expect(balanceKind('1250000.00')).toBe('debt');
    expect(balanceKind('-5000.50')).toBe('advance');
    expect(balanceKind('0.00')).toBe('zero');
    expect(balanceKind('-0.00')).toBe('zero');
  });
});
