/**
 * Bildirishnoma turlari (TZ 3.4, 3.6) — ta'rifi `prisma/schema.prisma` da
 * (B-012). Biznes-servis shu turni chiqaradi, KANALNI BILMAYDI — kanal
 * tanlash NotificationService zimmasida (CLAUDE.md qoida 10).
 *
 *   ORDER_CREATED        — buyurtma qabul qilindi
 *   ORDER_STATUS_CHANGED — buyurtma holati o'zgardi
 *   PAYMENT_RECEIVED     — "To'landi" xabarnomasi
 *   NEW_PRODUCT          — yangi mahsulot qo'shildi
 *   COMMENT_REPLY        — izoh/javob keldi
 *   CONTRACT_READY       — shartnoma tayyor (B-045)
 *   ANNOUNCEMENT         — xodim yuborgan xabar: bayram, e'lon (T-009)
 *
 * ⚠ Bildirishnoma faqat OPTOM mijozga yoki XODIMGA boradi — chakana
 *   mijozda hisob yo'q (TZ 3.5, 3.6).
 */
export { NotificationType } from '../../prisma/prisma-client';
