import { describe, expect, it } from 'vitest';
import { kpiCards } from './kpi';

const ids = (role: Parameters<typeof kpiCards>[0]) => kpiCards(role).map((c) => c.id);

describe('bosh sahifa ko‘rsatkichlari (D-041)', () => {
  it('rol bo‘yicha kartochkalar', () => {
    // 🆕 B-063: 'today' (barcha buyurtma huquqiga) va 'stock-low'/'stock-out'
    //   (barcha xodimga, `stock.view` — ALL_STAFF) qo'shildi — statistika
    //   endpointi kelgunga qadar bu ikkisi umuman ko'rsatib bo'lmasdi.
    expect(ids({ id: 'u', role: 'SUPER_ADMIN' })).toEqual([
      'new', 'urgent', 'unpaid', 'today', 'supply-review', 'stock-low', 'stock-out', 'customers', 'debtors',
    ]);
    expect(ids({ id: 'u', role: 'MODERATOR' })).toEqual([
      'new', 'urgent', 'unpaid', 'today', 'supply-review', 'stock-low', 'stock-out', 'customers', 'debtors',
    ]);
    expect(ids({ id: 'u', role: 'BRANCH_ADMIN' })).toEqual([
      'new', 'urgent', 'unpaid', 'today', 'supply-branch', 'stock-low', 'stock-out', 'customers', 'debtors',
    ]);
    expect(ids({ id: 'u', role: 'MANAGER' })).toEqual([
      'mine', 'new', 'urgent', 'unpaid', 'today', 'supply-branch', 'stock-low', 'stock-out', 'customers', 'debtors',
    ]);
    expect(kpiCards(undefined)).toEqual([]);
  });

  it('havola ro‘yxatni AYNAN son olingan filtr bilan ochadi', () => {
    const cards = kpiCards({ id: 'm1', role: 'MANAGER' });
    const href = (id: string) => cards.find((c) => c.id === id)?.href;
    expect(href('mine')).toBe('/orders?managerId=m1');
    expect(href('urgent')).toBe('/orders?isUrgent=true');
    expect(href('unpaid')).toBe('/orders?paymentStatus=PENDING');
    expect(href('supply-branch')).toBe('/supply-orders?status=NEW');
    expect(href('debtors')).toBe('/customers?hasDebt=true');
  });
});
