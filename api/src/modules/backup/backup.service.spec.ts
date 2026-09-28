import type { AppConfigService } from '../../config';
import type { PrismaService } from '../../prisma';
import { BackupService, STATUS_SHEET } from './backup.service';
import type { BackupTable } from './backup-table';
import type { BackupMirror } from './mirrors';

const config = {
  backup: { provider: 'file', intervalMinutes: 15, fileDir: 'x', google: {} },
} as unknown as AppConfigService;

/** Bitta `Lead` jadvali bor soxta baza (qolgan delegate'lar yo'q — o'tkazib yuboriladi). */
function fakePrisma(rows: { id: string }[]) {
  return {
    lead: { findMany: jest.fn(() => Promise.resolve(rows)) },
  } as unknown as PrismaService;
}

function recorder(
  write: (tables: BackupTable[]) => Promise<void> = () => Promise.resolve(),
) {
  const writes: BackupTable[][] = [];
  const mirror: BackupMirror = {
    target: '/tmp/x',
    write: (tables) => {
      writes.push(tables);
      return write(tables);
    },
  };
  return { mirror, writes };
}

describe('BackupService', () => {
  it('birinchi urinish yuboradi, `_holat` varag‘i birinchi', async () => {
    const { mirror, writes } = recorder();
    const status = await new BackupService(
      fakePrisma([{ id: 'l1' }]),
      config,
      mirror,
    ).run();
    expect(status.lastResult).toBe('SENT');
    expect(writes[0][0].name).toBe(STATUS_SHEET);
    expect(writes[0].find((t) => t.name === 'leads')?.rows).toEqual([
      expect.arrayContaining(['l1']),
    ]);
    expect(status.tables).toContainEqual({ name: 'leads', rows: 1 });
  });

  it('ma’lumot o‘zgarmasa qayta yuborilmaydi; `force` yuboradi', async () => {
    const { mirror, writes } = recorder();
    const service = new BackupService(
      fakePrisma([{ id: 'l1' }]),
      config,
      mirror,
    );
    await service.run();
    expect((await service.run()).lastResult).toBe('UNCHANGED');
    expect(writes).toHaveLength(1);
    await service.run({ force: true });
    expect(writes).toHaveLength(2);
  });

  it('xato ilovani yiqitmaydi — holatga yoziladi, keyingisi qayta urinadi', async () => {
    let fail = true;
    const { mirror, writes } = recorder(() =>
      fail ? Promise.reject(new Error('Google 503')) : Promise.resolve(),
    );
    const service = new BackupService(
      fakePrisma([{ id: 'l1' }]),
      config,
      mirror,
    );
    const failed = await service.run();
    expect(failed).toMatchObject({
      lastResult: 'FAILED',
      lastError: 'Google 503',
      lastSuccessAt: null,
    });
    fail = false;
    const ok = await service.run();
    expect(ok).toMatchObject({ lastResult: 'SENT', lastError: null });
    expect(writes).toHaveLength(2);
  });

  it('bir vaqtda ikki chaqiruv — bitta yozish', async () => {
    const { mirror, writes } = recorder();
    const service = new BackupService(
      fakePrisma([{ id: 'l1' }]),
      config,
      mirror,
    );
    await Promise.all([service.run(), service.run()]);
    expect(writes).toHaveLength(1);
  });

  it('provayder `off` — hech narsa qilmaydi', async () => {
    const status = await new BackupService(fakePrisma([]), config, null).run();
    expect(status).toMatchObject({
      enabled: false,
      target: null,
      lastRunAt: null,
    });
  });
});
