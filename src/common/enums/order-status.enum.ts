/**
 * Buyurtma bosqichlari — ta'rifi `prisma/schema.prisma` da (B-010).
 *
 *   NEW                 — Buyurtma qabul qilindi
 *   SEARCHING_TRANSPORT — Mashina qidirilmoqda
 *   LOADING             — Yuklash jarayonida
 *   DELIVERING          — Yetkazib berilmoqda
 *   DELIVERED           — Yetkazildi
 *   CANCELLED           — Bekor qilindi
 *
 * ❓ OCHIQ SAVOL №1: TZ 3.4 da ikki xil ro'yxat bor — mijoz tasdiqlagach
 *    bitta enum + bitta migratsiya bilan o'zgartiriladi (B-029).
 */
export { OrderStatus } from '../../prisma/prisma-client';
