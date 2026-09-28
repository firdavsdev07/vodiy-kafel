/** Jadvalning bitta katakchasi — Sheets/CSV ga to'g'ridan-to'g'ri yoziladi. */
export type BackupCell = string | number | boolean | null;

/** Bitta jadval nusxasi: varaq nomi, ustunlar, qatorlar (ustun tartibida). */
export interface BackupTable {
  name: string;
  columns: string[];
  rows: BackupCell[][];
}
