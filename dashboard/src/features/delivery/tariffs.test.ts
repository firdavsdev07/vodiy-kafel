import { describe, expect, it } from 'vitest';
import { buildMatrix, cellKey, draftToUpserts, type Tariff } from './tariffs';

const regions = [
  { id: 'r1', name: 'Farg‘ona', isActive: true },
  { id: 'r2', name: 'Andijon', isActive: true },
  { id: 'r3', name: 'Yopiq', isActive: false },
];
const types = [
  { id: 't1', name: 'Fura', isActive: true, capacityPallets: 20 },
  { id: 't2', name: 'Vagon', isActive: true, capacityPallets: 60 },
];
const tariff = (r: string, t: string, price: string, isActive = true): Tariff => ({
  id: `${r}${t}`,
  branch: { id: 'b1', name: 'Farg‘ona' },
  region: { id: r, name: r },
  transportType: { id: t, name: t, capacityPallets: 20 },
  price,
  isActive,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
});

describe('tarif matritsasi (D-039)', () => {
  const matrix = buildMatrix(regions, types, [tariff('r1', 't1', '4000000'), tariff('r2', 't1', '5000000', false)]);

  it('faqat faol viloyat/transport; bo‘sh va nofaol kataklar sanaladi', () => {
    expect(matrix.rows.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(matrix.columns).toHaveLength(2);
    // r1:t2, r2:t1 (nofaol), r2:t2 — 3 ta
    expect(matrix.missing).toBe(3);
  });

  it('faqat o‘zgargan va yangi kataklar PUT; filial admini uchun branchId yo‘q', () => {
    const drafts = new Map([
      [cellKey('r1', 't1'), '4000000.00'], // o'zgarmagan
      [cellKey('r1', 't2'), '9000000'], // yangi
      [cellKey('r2', 't1'), '5500000'], // o'zgargan (nofaol)
      [cellKey('r2', 't2'), ''], // bo'sh qoldirilgan yangi — e'tiborsiz
    ]);
    expect(draftToUpserts(drafts, matrix, null)).toEqual({
      ok: true,
      upserts: [
        { regionId: 'r1', transportTypeId: 't2', price: '9000000' },
        { regionId: 'r2', transportTypeId: 't1', price: '5500000' },
      ],
    });
  });

  it('SUPER_ADMIN: branchId har so‘rovda', () => {
    const r = draftToUpserts(new Map([[cellKey('r1', 't2'), '1']]), matrix, 'b9');
    expect(r.ok && r.upserts[0]?.branchId).toBe('b9');
  });

  it('xatolar: mavjudni bo‘shatish, nol, manfiy, 3 xonali kasr', () => {
    const r = draftToUpserts(
      new Map([
        [cellKey('r1', 't1'), ''],
        [cellKey('r1', 't2'), '0'],
        [cellKey('r2', 't1'), '-5'],
        [cellKey('r2', 't2'), '10.123'],
      ]),
      matrix,
      null,
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && [...r.errors.keys()].sort()).toEqual(['r1:t1', 'r1:t2', 'r2:t1', 'r2:t2']);
  });
});
