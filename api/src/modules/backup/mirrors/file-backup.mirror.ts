import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { BackupCell, BackupTable } from '../backup-table';
import type { BackupMirror } from './backup-mirror.interface';

const escapeCsv = (cell: BackupCell): string => {
  if (cell === null) return '';
  const text = String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(table: BackupTable): string {
  return [table.columns, ...table.rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');
}

/**
 * Mahalliy CSV (`BACKUP_PROVIDER=file`): har jadval — `<papka>/<jadval>.csv`.
 * Google'siz sinash uchun va qo'shimcha nusxa sifatida. BOM — Excel
 * o'zbekcha harflarni to'g'ri ochsin. Avval vaqtinchalik faylga yoziladi,
 * keyin nomi almashtiriladi — yozish uzilsa eski nusxa buzilmaydi.
 */
export class FileBackupMirror implements BackupMirror {
  readonly target: string;

  constructor(dir: string) {
    this.target = resolve(dir);
  }

  async write(tables: BackupTable[]): Promise<void> {
    await mkdir(this.target, { recursive: true });
    for (const table of tables) {
      const file = join(this.target, `${table.name}.csv`);
      await writeFile(`${file}.tmp`, '﻿' + toCsv(table), 'utf8');
      await rename(`${file}.tmp`, file);
    }
  }
}
