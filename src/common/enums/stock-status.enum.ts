/**
 * Zaxira holati — bazada YO'Q, `ProductStock.stockPallets` dan HISOBLANADI
 * (shuning uchun qo'lda yoziladi, Prisma sxemasidan kelmaydi).
 *
 * ⚠ Bu — auth bor joyda (optom mijoz kabineti, admin panel) ko'rinadigan
 *   uch rangli variant: 🟢 IN_STOCK / 🟡 LOW / 🔴 OUT_OF_STOCK.
 *   OCHIQ katalogda esa faqat ikki holat bo'ladi — `PublicAvailability`
 *   (TZ 3.2: "Ochiq katalogda faqat «Mavjud / Mavjud emas» ko'rinadi").
 *
 * Aniq son hech qachon public javobga chiqmaydi (CLAUDE.md qoida 2).
 */
export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW = 'LOW',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

/** Ochiq katalog uchun — mehmon faqat shu ikki holatni ko'radi. */
export enum PublicAvailability {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
}
