import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileBackupMirror, toCsv } from './file-backup.mirror';

describe('FileBackupMirror', () => {
  it('CSV: vergul, qo‘shtirnoq va yangi qator qochiriladi, null — bo‘sh', () => {
    expect(
      toCsv({
        name: 't',
        columns: ['a', 'b'],
        rows: [
          ['x,y', 'say "hi"'],
          [null, 'a\nb'],
          [1, true],
        ],
      }),
    ).toBe('a,b\r\n"x,y","say ""hi"""\r\n,"a\nb"\r\n1,true');
  });

  it('har jadval — alohida fayl, BOM bilan, qayta yozilganda almashtiriladi', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vk-backup-'));
    try {
      const mirror = new FileBackupMirror(dir);
      await mirror.write([
        { name: 'orders', columns: ['id'], rows: [['o1'], ['o2']] },
      ]);
      await mirror.write([{ name: 'orders', columns: ['id'], rows: [['o1']] }]);
      expect(await readFile(join(dir, 'orders.csv'), 'utf8')).toBe('﻿id\r\no1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
