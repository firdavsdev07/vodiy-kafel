/**
 * Filial turi — ta'rifi `prisma/schema.prisma` da (B-009).
 *
 * ⚠ BAZADAGI enum'lar IKKI marta yozilmaydi: manba — Prisma sxemasi,
 *   kod esa har doim shu yerdan import qiladi (B-005, "Enum'lar bitta joyda").
 *   Qo'lda yoziladigan enum'lar faqat bazada YO'Q bo'lganlari:
 *   StockStatus (hisoblanadi) va SortOrder (sahifalash).
 *
 *   RETAIL  — faqat narx saqlaydi, o'z zaxirasi yo'q
 *   CENTRAL — haqiqiy zaxira shu yerda, xodimi MODERATOR
 */
export { BranchType } from '../../prisma/prisma-client';
