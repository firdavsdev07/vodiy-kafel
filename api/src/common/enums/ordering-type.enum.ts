/**
 * KIM buyurtma bermoqda (TZ 3.7.2) — ta'rifi `prisma/schema.prisma` da (B-010).
 *
 *   CUSTOMER — filialga biriktirilgan optom mijoz
 *   BRANCH   — RETAIL filial markaziy ombordan ta'minot so'ramoqda (B-058)
 *   AGENT    — markaziy omborga bevosita biriktirilgan B2B agent
 *
 * Filial "xuddi mijoz kabi" buyurtma bergani uchun alohida jadval emas,
 * shu `Order` ning bir turi — narx zanjiri va kalkulyator qayta yozilmaydi.
 */
export { OrderingType } from '../../prisma/prisma-client';
