import { describe, expect, it } from 'vitest';
import { parseListParams } from '@/shared/lib/list-params';
import {
  branchOrderConfig,
  isDateRangeInvalid,
  isQuickFilterActive,
  nextDay,
  quickFilters,
  superAdminOrderConfig,
  tashkentDayStart,
  toggleQuickFilter,
  toOrdersQuery,
} from './list';

const query = (search: string, config = superAdminOrderConfig) =>
  toOrdersQuery(parseListParams(new URLSearchParams(search), config));

describe('buyurtmalar ro‘yxati (D-024)', () => {
  it('filtrlar API so‘roviga; noma’lum enum qiymatlari tashlanadi', () => {
    expect(query('status=NEW&source=PHONE&paymentStatus=PENDING&isUrgent=true&managerId=m1&search=VK-2026')).toEqual({
      page: 1,
      limit: 20,
      status: 'NEW',
      source: 'PHONE',
      paymentStatus: 'PENDING',
      isUrgent: true,
      managerId: 'm1',
      search: 'VK-2026',
    });
    expect(query('status=HACK&source=x&paymentStatus=y&isUrgent=maybe')).toEqual({ page: 1, limit: 20 });
    expect(query('isUrgent=false')).toEqual({ page: 1, limit: 20, isUrgent: false });
  });

  it('🔒 G5: filial filtri faqat SUPER_ADMIN konfiguratsiyasida o‘qiladi', () => {
    expect(query('branchId=b1')).toMatchObject({ branchId: 'b1' });
    expect(query('branchId=b1', branchOrderConfig)).not.toHaveProperty('branchId');
  });

  it('sana — Toshkent kuni; "gacha" shu kunni ham oladi (API ga ertasi kun)', () => {
    expect(query('dateFrom=2026-09-01&dateTo=2026-09-30')).toMatchObject({
      dateFrom: '2026-09-01T00:00:00+05:00',
      dateTo: '2026-10-01T00:00:00+05:00',
    });
    expect(query('dateFrom=2026-02-30&dateTo=abc')).toEqual({ page: 1, limit: 20 });
  });

  it('kalendar: oy va yil chegarasi, kabisa yili', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
    expect(nextDay('2026-02-28')).toBe('2026-03-01');
    expect(tashkentDayStart('2026-13-01')).toBeUndefined();
  });

  it('teskari sana oralig‘i aniqlanadi; bitta kun — to‘g‘ri', () => {
    expect(isDateRangeInvalid({ dateFrom: '2026-09-10', dateTo: '2026-09-01' })).toBe(true);
    expect(isDateRangeInvalid({ dateFrom: '2026-09-10', dateTo: '2026-09-10' })).toBe(false);
    expect(isDateRangeInvalid({ dateFrom: '2026-09-10' })).toBe(false);
    // backend 400 bermasin — teskari oraliq so'rovga umuman qo'shilmaydi
    expect(query('dateFrom=2026-09-10&dateTo=2026-09-01')).toEqual({ page: 1, limit: 20 });
  });

  it('tez filtrlar: "Menga biriktirilgan" faqat menejerga', () => {
    expect(quickFilters({ id: 'u1', isManager: false }).map((q) => q.id)).toEqual(['new', 'urgent', 'unpaid']);
    const mine = quickFilters({ id: 'u1', isManager: true }).find((q) => q.id === 'mine');
    expect(mine?.filters).toEqual({ managerId: 'u1' });
  });

  it('tez filtr bosish: qo‘yadi, qayta bosish — oladi, boshqa filtrga tegmaydi', () => {
    const urgent = quickFilters(null).find((q) => q.id === 'urgent')!;
    expect(toggleQuickFilter(urgent, { status: 'NEW' })).toEqual({ isUrgent: 'true' });
    expect(isQuickFilterActive(urgent, { status: 'NEW', isUrgent: 'true' })).toBe(true);
    expect(toggleQuickFilter(urgent, { status: 'NEW', isUrgent: 'true' })).toEqual({ isUrgent: undefined });
  });
});
