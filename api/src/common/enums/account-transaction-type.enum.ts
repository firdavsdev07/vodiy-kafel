/**
 * Hisob harakati turi (TZ 3.11) — ta'rifi `prisma/schema.prisma` da (B-011).
 *
 *   DEBT       — yangi qarz (buyurtma berilganda). `amount` MUSBAT
 *   PAYMENT    — to'lov tushdi.                    `amount` MANFIY
 *   ADJUSTMENT — tuzatish.                         `amount` ikki tomonga ham
 *
 * `amount` ishorali saqlangani uchun balans bitta formula: `Σ amount`.
 * Ishora/tur mosligi baza darajasida qulflangan (`..._sign_check`).
 *
 * ⚠ Yozuv o'zgartirilmaydi/o'chirilmaydi — baza triggeri to'sadi.
 *   Xatoni tuzatish yo'li: teskari ishorali ADJUSTMENT (CLAUDE.md qoida 9).
 */
export { AccountTransactionType } from '../../prisma/prisma-client';
