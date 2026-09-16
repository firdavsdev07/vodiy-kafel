import { describe, expect, it } from 'vitest';
import { zMoney, zOptionalText, zRequiredText, zUzPhone } from './validation';

describe('validation (D-008)', () => {
  it('zMoney — backend @IsPositiveDecimalString bilan bir xil', () => {
    const money = zMoney(12, 2);
    for (const ok of ['1', '85000', '85000.5', '0.01', '999999999999.99']) {
      expect(money.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ['', '0', '0.00', '-5', '1.234', '1e5', '1000000000000', '85 000', '.5']) {
      expect(money.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('zUzPhone → +998…', () => {
    expect(zUzPhone().parse('90 123 45 67')).toBe('+998901234567');
    const bad = zUzPhone().safeParse('90 123');
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toMatch(/to‘liq/);
  });

  it('matn: trim, bo‘sh ixtiyoriy → undefined, o‘zbekcha xabar', () => {
    expect(zRequiredText().parse('  Zavod  ')).toBe('Zavod');
    expect(zRequiredText().safeParse('   ').error?.issues[0]?.message).toBe('Maydonni to‘ldiring');
    expect(zOptionalText().parse('  ')).toBeUndefined();
  });
});
