import { describe, expect, it } from 'vitest';
import { applyBulk, validateBulkInput } from './bulk-price';

describe('ommaviy narx hisobi (D-017, G6)', () => {
  it('aniq summa', () => {
    expect(applyBulk('85000.00', 'set', '90000')).toEqual({ ok: true, price: '90000' });
    expect(applyBulk('85000.00', 'set', '90000,5')).toEqual({ ok: true, price: '90000.50' });
  });

  it('foiz — float xatosisiz, yarmidan yuqoriga yumaloqlash', () => {
    expect(applyBulk('85000.00', 'percent', '10')).toEqual({ ok: true, price: '93500' });
    expect(applyBulk('85000.10', 'percent', '10')).toEqual({ ok: true, price: '93500.11' });
    expect(applyBulk('99999.99', 'percent', '-5,5')).toEqual({ ok: true, price: '94499.99' });
    // 0.1 + 0.2 muammosi: Number bilan 0.30000000000000004
    expect(applyBulk('0.10', 'percent', '200')).toEqual({ ok: true, price: '0.30' });
    // Katta summa — Number.MAX_SAFE_INTEGER dan oshsa ham aniq
    expect(applyBulk('999999999999.99', 'percent', '1')).toEqual({ ok: true, price: '1009999999999.99' });
  });

  it('qo‘shish/ayirish', () => {
    expect(applyBulk('85000.00', 'add', '+2500')).toEqual({ ok: true, price: '87500' });
    expect(applyBulk('85000.00', 'add', '-5000.5')).toEqual({ ok: true, price: '79999.50' });
    expect(applyBulk('3000.00', 'add', '-5000')).toEqual({ ok: false, reason: 'Yangi narx 0 yoki manfiy bo‘lib qoladi' });
  });

  it('kiritish tekshiruvi', () => {
    expect(validateBulkInput('set', '')).toBe('Qiymatni kiriting');
    expect(validateBulkInput('set', '0')).not.toBeNull();
    expect(validateBulkInput('set', '12.345')).not.toBeNull();
    expect(validateBulkInput('percent', '10')).toBeNull();
    expect(validateBulkInput('percent', '-100')).not.toBeNull();
    expect(validateBulkInput('percent', '0')).not.toBeNull();
    expect(validateBulkInput('percent', '1001')).not.toBeNull();
    expect(validateBulkInput('percent', 'abc')).not.toBeNull();
    expect(validateBulkInput('add', '+0')).not.toBeNull();
    expect(validateBulkInput('add', '-2000')).toBeNull();
  });
});
