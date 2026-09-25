import { describe, expect, it } from 'vitest';
import { formatDayLong, formatDayShort, formatPeriod, quickRange, rangeError, tashkentParts, toIso } from './daily-range';

// 2026-09-25 18:30 Toshkent = 13:30 UTC
const NOW = new Date('2026-09-25T13:30:00Z');

describe('kunlik chart davri (T-010)', () => {
  it('Toshkent vaqti: UTC+5, brauzer mintaqasidan qat’i nazar', () => {
    expect(tashkentParts(NOW)).toEqual({ date: '2026-09-25', time: '18:30' });
    // UTC da hali 24-sentabr — Toshkentda allaqachon 25
    expect(tashkentParts(new Date('2026-09-24T20:00:00Z'))).toEqual({ date: '2026-09-25', time: '01:00' });
    expect(toIso('2026-09-25', '09:00')).toBe('2026-09-25T09:00:00+05:00');
  });

  it('tezkor tugmalar hozirdan orqaga; kalendar va soat shu qiymatga to‘ladi', () => {
    expect(quickRange('3d', NOW)).toEqual({ fromDate: '2026-09-22', fromTime: '18:30', toDate: '2026-09-25', toTime: '18:30' });
    expect(quickRange('7d', NOW).fromDate).toBe('2026-09-18');
    expect(quickRange('15d', NOW).fromDate).toBe('2026-09-10');
    expect(quickRange('1m', NOW).fromDate).toBe('2026-08-25');
    expect(quickRange('3m', NOW).fromDate).toBe('2026-06-25');
    expect(quickRange('6m', NOW).fromDate).toBe('2026-03-25');
    expect(quickRange('12m', NOW).fromDate).toBe('2025-09-25');
  });

  it('oy oxiri: 31-mart − 1 oy → 28-fevral', () => {
    expect(quickRange('1m', new Date('2026-03-31T07:00:00Z')).fromDate).toBe('2026-02-28');
  });

  it('davr tekshiruvi', () => {
    const ok = quickRange('7d', NOW);
    expect(rangeError(ok)).toBeNull();
    expect(rangeError(quickRange('12m', NOW))).toBeNull();
    expect(rangeError({ ...ok, fromDate: ok.toDate, fromTime: ok.toTime })).toMatch(/oldin/);
    expect(rangeError({ ...ok, fromDate: '2024-01-01' })).toMatch(/12 oy/);
    expect(rangeError({ ...ok, fromDate: '' })).toMatch(/Sanalarni/);
  });

  it('sana yozuvlari — qaysi kun ekani aniq', () => {
    expect(formatDayLong('2026-09-25')).toBe('25-sentabr 2026, juma');
    expect(formatDayShort('2026-09-25')).toBe('25-sen');
    expect(formatPeriod(quickRange('3d', NOW))).toBe('22-sentabr 2026, 18:30 → 25-sentabr 2026, 18:30');
  });
});
