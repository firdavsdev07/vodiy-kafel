import type { BackupTable } from '../backup-table';

export const BACKUP_MIRROR = Symbol('BACKUP_MIRROR');

/**
 * Zaxira nusxa qayerga yoziladi (T-018). `BackupService` provayderni
 * bilmaydi — faqat shu interfeysni (CLAUDE.md qoida 3).
 *
 * `write` har jadvalni TO'LIQ almashtiradi (qo'shib bormaydi): bir xil
 * ma'lumot ikki marta yozilsa natija bir xil.
 */
export interface BackupMirror {
  /** Holatda ko'rsatiladigan manzil (Spreadsheet havolasi yoki papka). */
  readonly target: string;
  write(tables: BackupTable[]): Promise<void>;
}
