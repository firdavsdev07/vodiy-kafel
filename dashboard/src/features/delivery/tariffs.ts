import type { Schema } from '@/shared/api';
import { normalizeDecimal } from '@/shared/lib/format';

export type Tariff = Schema<'TariffAdminDto'>;
export type UpsertTariffBody = Schema<'UpsertTariffDto'>;

type Ref = { id: string; name: string };

export const cellKey = (regionId: string, transportTypeId: string) => `${regionId}:${transportTypeId}`;

export interface TariffMatrix {
  rows: readonly Ref[];
  columns: readonly (Ref & { capacityPallets: number })[];
  /** kalit → tarif; yo'q kalit — to'ldirilmagan katak */
  cells: ReadonlyMap<string, Tariff>;
  /** Faol tarifi yo'q kataklar soni — shu yo'nalishga yetkazib berishni hisoblab bo'lmaydi */
  missing: number;
}

/**
 * Matritsa (D-039): qator — viloyat, ustun — transport turi, katak — narx.
 * Faqat FAOL viloyat/transport ko'rsatiladi (nofaoli tanlovda yo'q).
 * ⚠ Bo'sh katak = shu yo'nalishda yo'l kira hisoblanmaydi (hisob xatosi) —
 *   shuning uchun alohida sanaladi va ko'zga tashlanadi.
 */
export function buildMatrix(
  regions: readonly (Ref & { isActive: boolean })[],
  types: readonly (Ref & { isActive: boolean; capacityPallets: number })[],
  tariffs: readonly Tariff[],
): TariffMatrix {
  const rows = regions.filter((r) => r.isActive);
  const columns = types.filter((t) => t.isActive);
  const cells = new Map(tariffs.map((t) => [cellKey(t.region.id, t.transportType.id), t]));
  let missing = 0;
  for (const r of rows) for (const c of columns) if (!cells.get(cellKey(r.id, c.id))?.isActive) missing++;
  return { rows, columns, cells, missing };
}

/** Backend `IsPositiveDecimalString(12, 2)`. */
const PRICE_RE = /^(?!0+(?:\.0+)?$)\d{1,12}(?:\.\d{1,2})?$/;

export type DraftResult =
  | { ok: true; upserts: UpsertTariffBody[] }
  | { ok: false; errors: ReadonlyMap<string, string> };

/**
 * Qoralama → PUT so'rovlari. Faqat O'ZGARGAN yoki YANGI kataklar ketadi.
 * Mavjud tarifni bo'shatib bo'lmaydi (o'chirish endpointi yo'q) — xato.
 * 🔒 `branchId` faqat SUPER_ADMIN uchun beriladi; filial admini uchun
 *    backend o'z filialini oladi (G5).
 */
export function draftToUpserts(drafts: ReadonlyMap<string, string>, matrix: TariffMatrix, branchId: string | null): DraftResult {
  const errors = new Map<string, string>();
  const upserts: UpsertTariffBody[] = [];
  for (const [key, raw] of drafts) {
    const value = raw.trim();
    const existing = matrix.cells.get(key);
    if (value === '') {
      if (existing) errors.set(key, 'Tarifni bo‘shatib bo‘lmaydi');
      continue;
    }
    if (!PRICE_RE.test(value)) {
      errors.set(key, 'Musbat summa');
      continue;
    }
    if (existing && normalizeDecimal(existing.price) === normalizeDecimal(value)) continue;
    const [regionId = '', transportTypeId = ''] = key.split(':');
    upserts.push({ ...(branchId ? { branchId } : {}), regionId, transportTypeId, price: value });
  }
  return errors.size > 0 ? { ok: false, errors } : { ok: true, upserts };
}
