/**
 * Narx zanjiri enum'lari (TZ 3.3.1, 3.14) — ta'rifi `prisma/schema.prisma`
 * da (B-052).
 *
 * `PricingDomain`    — PRODUCT | TRANSPORT. Mahsulot narxi ham, transport
 *                      narxi ham AYNI BIR zanjirdan o'tadi (B-054).
 * `PricingScope`     — aniqlik darajasi. Eng aniq qoida g'olib chiqadi:
 *                        PRODUCT → FACTORY → ALL → bazaviy narx
 *                        ROUTE   → ALL     → bazaviy tarif
 * `PricingValueType` — FIXED (aniq summa) | PERCENT (masalan -20)
 *
 * Domen/scope/nishon mosligi va daraja bo'yicha yakkalik (bir mijozga bir
 * darajada bitta qoida) baza darajasida qulflangan (CLAUDE.md qoida 12).
 */
export {
  PricingDomain,
  PricingScope,
  PricingValueType,
} from '../../prisma/prisma-client';
