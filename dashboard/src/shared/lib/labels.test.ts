import { describe, expect, it } from 'vitest';
import { orderStatusLabel, paymentStatusLabel, roleLabel, stockStatusLabel } from './labels';
import { orderStatusTone, paymentStatusTone, stockStatusTone } from './status-tone';

describe('lug‘at (G7)', () => {
  it('har holatda ham rang, ham matn bor — kalitlar bir xil', () => {
    expect(Object.keys(orderStatusLabel).sort()).toEqual(Object.keys(orderStatusTone).sort());
    expect(Object.keys(paymentStatusLabel).sort()).toEqual(Object.keys(paymentStatusTone).sort());
    expect(Object.keys(stockStatusLabel).sort()).toEqual(Object.keys(stockStatusTone).sort());
    for (const dict of [orderStatusLabel, paymentStatusLabel, stockStatusLabel, roleLabel]) {
      for (const text of Object.values(dict)) expect(text.trim()).not.toBe('');
    }
  });
});
