/**
 * To'lov usuli (TZ 3.4) — ta'rifi `prisma/schema.prisma` da (B-011).
 *
 *   CASH          — naqd pul
 *   CARD          — karta orqali avtomatik
 *   BANK_TRANSFER — shartnoma asosida hisob raqamga o'tkazma (perechislenie)
 *
 * ⚠ Konkret provayder (Click / Payme) nomi kodda B-050 gacha uchramaydi —
 *   u CARD toifasining ichida, to'lov moduli tanlaydi (CLAUDE.md qoida 3).
 *   Hozircha hammasi `MockPaymentProvider` ortida.
 */
export { PaymentMethod } from '../../prisma/prisma-client';
