import { Prisma } from '../../prisma/prisma-client';
import { collectTables, toCell } from './table-snapshot';

type FindManyArgs = { select: unknown; orderBy: unknown; skip: number };

const field = (name: string, extra: Partial<Prisma.DMMF.Field> = {}) =>
  ({ name, kind: 'scalar', isId: false, ...extra }) as Prisma.DMMF.Field;

const userModel = {
  name: 'User',
  dbName: 'users',
  primaryKey: null,
  fields: [
    field('id', { isId: true }),
    field('phone'),
    field('passwordHash'),
    field('branch', { kind: 'object' }),
    field('createdAt'),
  ],
} as unknown as Prisma.DMMF.Model;

describe('toCell', () => {
  it('pul (Decimal) va BigInt — aniq satr, vaqt — Toshkent formatida', () => {
    expect(toCell(new Prisma.Decimal('12345678901234567.25'))).toBe(
      '12345678901234567.25',
    );
    expect(toCell(10n ** 20n)).toBe('100000000000000000000');
    expect(toCell(new Date('2026-09-28T10:00:00Z'))).toBe(
      '28.09.2026 15:00:00',
    );
  });

  it('son/boolean o‘zgarmaydi, null qoladi, JSON — satr', () => {
    expect(toCell(5)).toBe(5);
    expect(toCell(false)).toBe(false);
    expect(toCell(null)).toBeNull();
    expect(toCell(undefined)).toBeNull();
    expect(toCell({ a: 1 })).toBe('{"a":1}');
  });

  it('50 000 belgidan uzun matn qirqiladi (Sheets chegarasi)', () => {
    expect((toCell('x'.repeat(60_000)) as string).length).toBe(50_000);
  });
});

describe('collectTables', () => {
  it('🔒 parol xeshi va relation maydonlari tushmaydi; tartib barqaror', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'u1',
        phone: '+998900000001',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const [table] = await collectTables({ user: { findMany } }, [userModel]);

    expect(table).toEqual({
      name: 'users',
      columns: ['id', 'phone', 'createdAt'],
      rows: [['u1', '+998900000001', '01.01.2026 05:00:00']],
    });
    const args = (findMany.mock.calls as FindManyArgs[][])[0][0];
    expect(args.select).toEqual({ id: true, phone: true, createdAt: true });
    expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
  });

  it('katta jadval bo‘laklab o‘qiladi', async () => {
    const page = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `u${i}` }));
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(page(5000))
      .mockResolvedValueOnce(page(3));
    const [table] = await collectTables({ user: { findMany } }, [userModel]);
    expect(table.rows).toHaveLength(5003);
    expect(
      (findMany.mock.calls as FindManyArgs[][]).map((c) => c[0].skip),
    ).toEqual([0, 5000]);
  });

  it('haqiqiy sxema: har model uchun delegate bor, passwordHash hech qayerda yo‘q', async () => {
    const source = new Proxy(
      {},
      { get: () => ({ findMany: () => Promise.resolve([]) }) },
    );
    const tables = await collectTables(source);
    expect(tables.length).toBe(Prisma.dmmf.datamodel.models.length);
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['orders', 'customers', 'account_transactions']),
    );
    for (const t of tables) expect(t.columns).not.toContain('passwordHash');
  });
});
