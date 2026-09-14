import {
  ZERO_MONEY,
  addMoney,
  isPositiveMoney,
  isZeroMoney,
  moneyEquals,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toMoney,
} from './money.util';

describe('money.util', () => {
  it('toMoney turli tipdagi qiymatlardan Decimal yasaydi', () => {
    expect(toMoney(100).toString()).toBe('100');
    expect(toMoney('99.50').toString()).toBe('99.5');
  });

  it('addMoney va subtractMoney to‘g‘ri hisoblaydi', () => {
    expect(addMoney(100, 50).toString()).toBe('150');
    expect(subtractMoney(100, 30).toString()).toBe('70');
  });

  it('multiplyMoney — narx × paddon soni', () => {
    expect(multiplyMoney(12000, 5).toString()).toBe('60000');
  });

  it('sumMoney — bo‘sh massiv uchun ZERO_MONEY qaytaradi', () => {
    expect(moneyEquals(sumMoney([]), ZERO_MONEY)).toBe(true);
    expect(sumMoney([100, 200, 300]).toString()).toBe('600');
  });

  it('isPositiveMoney va isZeroMoney', () => {
    expect(isPositiveMoney(1)).toBe(true);
    expect(isPositiveMoney(0)).toBe(false);
    expect(isZeroMoney(0)).toBe(true);
    expect(isZeroMoney(1)).toBe(false);
  });

  it('Decimal.js immutable — argument o‘zgarmaydi', () => {
    const price = toMoney(100);
    const result = addMoney(price, 50);
    expect(price.toString()).toBe('100');
    expect(result.toString()).toBe('150');
  });
});
