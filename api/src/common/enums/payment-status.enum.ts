/**
 * To'lov holati — ta'rifi `prisma/schema.prisma` da (B-011).
 * Naqd/o'tkazma uchun admin qo'lda PAID qiladi.
 *
 * ⚠ PAID bo'lsa `paidAt` to'ldirilishi shart — baza darajasida qulflangan
 *   (`payments_paid_at_check`).
 */
export { PaymentStatus } from '../../prisma/prisma-client';
