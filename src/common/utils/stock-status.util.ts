import { StockStatus } from '../enums';

/**
 * `stock.lowThresholdPallets` sozlamasi topilmaganda ishlatiladigan zaxira
 * chegarasi. Seed uni 20 qilib yozadi, lekin jadval bo'sh bo'lishi ham
 * mumkin — bunday holatda «kam qoldi» ogohlantirishi butunlay yo'qolib
 * ketmasligi uchun.
 */
export const FALLBACK_LOW_STOCK_THRESHOLD = 20;

/**
 * Zaxira soni → uch rangli holat (TZ 3.2).
 *
 * 🔒 Bu FAQAT auth bor joyda ko'rsatiladi — optom mijoz kabineti va admin
 *    panel. Ochiq katalog ikki holatli `PublicAvailability` ni oladi
 *    ([[products.service]] dagi `toAvailability`).
 *
 * @param stockPallets Ombordagi son. `undefined` — zaxira yozuvi umuman yo'q.
 * @param threshold    Mahsulotning o'z chegarasi yoki global sozlama.
 */
export const toStockStatus = (
  stockPallets: number | undefined | null,
  threshold: number = FALLBACK_LOW_STOCK_THRESHOLD,
): StockStatus => {
  // Zaxira yozuvi yo'q — "noma'lum" ni "bor" deb ko'rsatmaymiz.
  if (!stockPallets || stockPallets <= 0) return StockStatus.OUT_OF_STOCK;
  return stockPallets <= threshold ? StockStatus.LOW : StockStatus.IN_STOCK;
};
