import { Prisma } from '../../prisma/prisma-client';
import type { BackupCell, BackupTable } from './backup-table';

/**
 * 🔒 Hech qachon tashqariga chiqmaydigan ustunlar: parol xeshi, token,
 * kalit. Nom bo'yicha — kelajakdagi jadvaldagi shunday ustun ham o'zi
 * tushib qoladi.
 */
const SECRET_FIELD = /hash$|secret|token/i;

/** Sheets bitta katakchaga 50 000 belgidan ko'pini qabul qilmaydi. */
const MAX_CELL_LENGTH = 50_000;
const BATCH_SIZE = 5_000;
const TASHKENT_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** ISO o'rniga odam tez o'qiydigan Toshkent vaqti: `DD.MM.YYYY HH:mm:ss`. */
export function formatBackupDate(value: Date): string {
  const parts = Object.fromEntries(
    TASHKENT_DATE_TIME.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

type FindMany = (args: {
  select: Record<string, true>;
  orderBy: Record<string, 'asc'>[];
  skip: number;
  take: number;
}) => Promise<Record<string, unknown>[]>;

/** Prisma klientining faqat kerakli qismi — testda soxtasi beriladi. */
export type SnapshotSource = Record<string, unknown>;

/**
 * Qiymatni katakchaga aylantiradi.
 *
 * Pul (`Decimal`) va `BigInt` — SATR: nusxa aniq bo'lishi kerak, float
 * yaxlitlashi (CLAUDE.md qoida 7) zaxirada ham kerak emas. Vaqt — ISO (UTC).
 */
export function toCell(value: unknown): BackupCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  let text: string;
  if (typeof value === 'string') text = value;
  else if (typeof value === 'bigint') text = value.toString();
  else if (value instanceof Date) text = formatBackupDate(value);
  else if (Prisma.Decimal.isDecimal(value)) text = value.toString();
  else text = JSON.stringify(value);
  return text.length > MAX_CELL_LENGTH ? text.slice(0, MAX_CELL_LENGTH) : text;
}

const delegateName = (model: string) => model[0].toLowerCase() + model.slice(1);

/**
 * Bazadagi BARCHA jadvallarni o'qiydi (T-018). Ro'yxat Prisma sxemasidan
 * olinadi — yangi model qo'shilsa, bu yerga hech narsa yozilmaydi.
 * Qatorlar barqaror tartibda (`createdAt`, keyin kalit) — o'zgarmagan
 * ma'lumot har safar bir xil nusxa beradi (keraksiz yuborish bo'lmaydi).
 */
export async function collectTables(
  source: SnapshotSource,
  models: readonly Prisma.DMMF.Model[] = Prisma.dmmf.datamodel.models,
): Promise<BackupTable[]> {
  const tables: BackupTable[] = [];
  for (const model of models) {
    const columns = model.fields
      .filter((f) => f.kind !== 'object' && !SECRET_FIELD.test(f.name))
      .map((f) => f.name);
    const keys =
      model.primaryKey?.fields ??
      model.fields.filter((f) => f.isId).map((f) => f.name);
    const orderBy = [
      ...(columns.includes('createdAt') ? ['createdAt'] : []),
      ...keys,
    ].map((name) => ({ [name]: 'asc' as const }));
    const select = Object.fromEntries(columns.map((c) => [c, true as const]));

    const delegate = source[delegateName(model.name)] as
      { findMany: FindMany } | undefined;
    if (!delegate) continue;

    const rows: BackupCell[][] = [];
    for (let skip = 0; ; skip += BATCH_SIZE) {
      const batch = await delegate.findMany({
        select,
        orderBy,
        skip,
        take: BATCH_SIZE,
      });
      for (const record of batch)
        rows.push(columns.map((c) => toCell(record[c])));
      if (batch.length < BATCH_SIZE) break;
    }
    tables.push({ name: model.dbName ?? model.name, columns, rows });
  }
  return tables;
}
