import type { Schema } from '@/shared/api';

export type StockRow = Schema<'ProductStockAdminResponseDto'>;
export type UpsertStockBody = Schema<'UpsertProductStockDto'>;

/** Backend `MAX_PALLETS` (int4) */
export const MAX_PALLETS = 2_147_483_647;

/**
 * Paddon soni — butun, 0…MAX. Kiritilgan matn → son yoki xato matni.
 * `Number` bu yerda xavfsiz: butun son, MAX_SAFE_INTEGER dan ancha kichik.
 */
export function parsePallets(raw: string): { value: number } | { error: string } {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return { error: 'Sonni kiriting' };
  if (!/^\d+$/.test(text)) return { error: 'Butun son (0 yoki katta)' };
  const value = Number(text);
  if (value > MAX_PALLETS) return { error: 'Juda katta son' };
  return { value };
}

/**
 * PUT tanasi. ⚠ `stockPallets` — ombordagi YANGI son (farq emas).
 * `lowStockThreshold`: yuborilmasa o'zgarmaydi, `null` — global sozlamaga.
 */
export function toStockBody(
  row: StockRow,
  change: { stockPallets?: number; threshold?: number | 'global' },
): UpsertStockBody {
  return {
    productId: row.product.id,
    stockPallets: change.stockPallets ?? row.stockPallets,
    ...(change.threshold === undefined
      ? {}
      : { lowStockThreshold: change.threshold === 'global' ? null : change.threshold }),
  };
}

/** Holat ko'rinishi uchun: o'zgarish qaysi tomonga (ogohlantirish matni). */
export function palletDelta(oldValue: number, newValue: number): string {
  const d = newValue - oldValue;
  if (d === 0) return 'o‘zgarmaydi';
  return d > 0 ? `+${d} paddon` : `${d} paddon`;
}
