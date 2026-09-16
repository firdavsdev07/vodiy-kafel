/**
 * Katalogda saralash mumkin bo'lgan maydonlar — bazada YO'Q, qo'lda
 * yoziladi (B-020).
 *
 * 🔒 Bu RO'YXAT majburiy: `PaginationQueryDto.sortBy` oddiy `string`, va
 *    uni to'g'ridan-to'g'ri Prisma `orderBy` ga uzatish mumkin emas —
 *    mavjud bo'lmagan maydon 500 xato berardi, mavjud lekin yashirin
 *    maydon (masalan `viewCount` emas, ichki ustun) esa kutilmagan
 *    tartibni ochib qo'yardi.
 *
 * ⚠ Narx bo'yicha saralash YO'Q va bo'lishi ham mumkin emas: narx
 *   `Product` da emas, `BranchProduct` da va mijozga qarab o'zgaradi
 *   (CLAUDE.md qoida 11). Ochiq katalog narxni umuman ko'rmaydi.
 */
export enum ProductSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  VIEW_COUNT = 'viewCount',
}
