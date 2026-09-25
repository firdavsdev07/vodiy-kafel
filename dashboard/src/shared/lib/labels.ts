import type { Schema } from '@/shared/api/types';
import type { StaffRole } from '@/shared/auth/profile';
import type { OrderingType, OrderSource, OrderStatus, PaymentMethod, PaymentStatus, StockStatus, TransactionType } from './status-tone';

/**
 * Enum → o'zbekcha matn — YAGONA lug'at (G7, D-043). Manba — `api/docs/enums.md`.
 *
 * Kalit turlari `schema.d.ts` dan (G2): backend enum'iga yangi qiymat qo'shilsa,
 * bu yerda yo'qligi TYPE XATOSI bo'ladi (`satisfies Record<…>`), jimgina bo'sh
 * matn emas. Qo'shimcha himoya — labels.test.ts lug'atni openapi.json bilan
 * solishtiradi.
 *
 * Komponentda enum matni qo'lda YOZILMAYDI — faqat shu yerdan.
 */

export type BranchType = Schema<'BranchAdminDto'>['type'];
export type ContractStatus = Schema<'ContractResponseDto'>['status'];
export type NotificationType = Schema<'NotificationDto'>['type'];
export type ProductSurface = Schema<'ProductListItemResponseDto'>['surface'];
export type MediaType = Schema<'ProductMediaResponseDto'>['type'];
export type PricingDomain = Schema<'CreatePricingRuleDto'>['domain'];
export type PricingScope = Schema<'CreatePricingRuleDto'>['scope'];
export type PricingValueType = Schema<'CreatePricingRuleDto'>['type'];
export const roleLabel = {
  SUPER_ADMIN: 'Bosh administrator',
  BRANCH_ADMIN: 'Filial administratori',
  MANAGER: 'Menejer',
  MODERATOR: 'Moderator (markaziy ombor)',
} as const satisfies Record<StaffRole, string>;

// Manba: api/docs/enums.md. Kalitlar status-tone.ts dagi turlar — backendga
// yangi holat qo'shilsa TYPE xatosi chiqadi.

export const orderStatusLabel = {
  NEW: 'Qabul qilindi',
  SEARCHING_TRANSPORT: 'Mashina qidirilmoqda',
  LOADING: 'Yuklanmoqda',
  DELIVERING: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
} as const satisfies Record<OrderStatus, string>;

/**
 * Holatga O'TKAZISH tugmasi matni (D-026) — `orderStatusLabel` holatning
 * nomi, bu esa amal: "Yuklashni boshlash". Tugmalar baribir faqat
 * `allowedNextStatuses` dan quriladi (G8).
 */
export const orderStatusActionLabel = {
  NEW: 'Qabul qilindi deb belgilash',
  SEARCHING_TRANSPORT: 'Mashina qidirishni boshlash',
  LOADING: 'Yuklashni boshlash',
  DELIVERING: 'Yo‘lga chiqdi',
  DELIVERED: 'Yetkazildi deb belgilash',
  CANCELLED: 'Buyurtmani bekor qilish',
} as const satisfies Record<OrderStatus, string>;

export const paymentStatusLabel = {
  PENDING: 'Kutilmoqda',
  PAID: 'To‘landi',
  FAILED: 'Muvaffaqiyatsiz',
  CANCELLED: 'Bekor qilindi',
} as const satisfies Record<PaymentStatus, string>;

export const stockStatusLabel = {
  IN_STOCK: 'Yetarli',
  LOW: 'Kam qoldi',
  OUT_OF_STOCK: 'Tugagan',
} as const satisfies Record<StockStatus, string>;

/** Buyurtma manbasi (api/docs/enums.md — OrderSource). */
export const orderSourceLabel = {
  WEBSITE: 'Sayt',
  TELEGRAM: 'Telegram',
  PHONE: 'Telefon',
  ADMIN: 'Admin panel',
} as const satisfies Record<OrderSource, string>;

/**
 * Kim buyurtma bermoqda (api/docs/enums.md — OrderingType). ⚠ `OrderSource`
 * bilan aralashtirilmaydi — bu boshqa o'lcham.
 */
export const orderingTypeLabel = {
  CUSTOMER: 'Optom mijoz',
  BRANCH: 'Filial ta’minoti',
  AGENT: 'Agent',
} as const satisfies Record<OrderingType, string>;

/**
 * To'lov usuli (api/docs/enums.md — PaymentMethod). ⚠ Karta to'lovi hozircha
 * mock (B-050) — provayder nomi ("Payme"/"Click") YOZILMAYDI.
 */
export const paymentMethodLabel = {
  CASH: 'Naqd pul',
  CARD: 'Karta orqali',
  BANK_TRANSFER: 'Hisob raqamga o‘tkazma',
} as const satisfies Record<PaymentMethod, string>;

/** Hisob harakati turi (api/docs/enums.md — AccountTransactionType). */
export const transactionTypeLabel = {
  DEBT: 'Qarz',
  PAYMENT: 'To‘lov',
  ADJUSTMENT: 'Tuzatish',
} as const satisfies Record<TransactionType, string>;

/** Mahsulot sirti (ProductSurface). */
export const surfaceLabel = {
  POL: 'Pol',
  DEVOR: 'Devor',
} as const satisfies Record<ProductSurface, string>;

/** Mahsulot media turi (MediaType). */
export const mediaTypeLabel = {
  IMAGE: 'Rasm',
  IMAGE_360: '360° rasm',
  VIDEO_360: '360° video',
} as const satisfies Record<MediaType, string>;

/**
 * Filial turi (BranchType). ⚠ Ular TENG EMAS: markaziy omborda zaxira bor,
 * do'konda — faqat narx.
 */
export const branchTypeLabel = {
  RETAIL: 'Do‘kon filiali',
  CENTRAL: 'Markaziy ombor',
} as const satisfies Record<BranchType, string>;

/** Shartnoma holati (ContractStatus, 🧪 mock — B-045). Hozircha dashboard'da ko'rinmaydi. */
export const contractStatusLabel = {
  DRAFT: 'Tayyorlandi',
  SENT: 'Yuborildi',
  SIGNED: 'Imzolandi',
} as const satisfies Record<ContractStatus, string>;

/** Bildirishnoma turi (NotificationType) — mijoz kabineti uchun; xodimda bildirishnoma yo'q (❓ 4). */
export const notificationTypeLabel = {
  ORDER_CREATED: 'Buyurtma qabul qilindi',
  ORDER_STATUS_CHANGED: 'Buyurtma holati o‘zgardi',
  PAYMENT_RECEIVED: 'To‘lov qabul qilindi',
  NEW_PRODUCT: 'Yangi mahsulot',
  COMMENT_REPLY: 'Javob keldi',
  CONTRACT_READY: 'Shartnoma tayyor',
  ANNOUNCEMENT: 'Xabar',
} as const satisfies Record<NotificationType, string>;

/** Narx qoidasi domeni (PricingDomain, D-019). */
export const pricingDomainLabel = {
  PRODUCT: 'Mahsulot narxi',
  TRANSPORT: 'Yo‘l kira',
} as const satisfies Record<PricingDomain, string>;

/** Narx qoidasi doirasi (PricingScope, D-019). */
export const pricingScopeLabel = {
  PRODUCT: 'Aynan shu mahsulotga',
  FACTORY: 'Shu zavodning barcha mahsulotiga',
  ROUTE: 'Aynan shu yo‘nalishga',
  ALL: 'Umumiy — barchasiga',
} as const satisfies Record<PricingScope, string>;

/** Narx qoidasi qiymati turi (PricingValueType, D-019). */
export const pricingValueTypeLabel = {
  FIXED: 'Aniq narx (so‘m)',
  PERCENT: 'Foiz',
} as const satisfies Record<PricingValueType, string>;

/**
 * Umumiy matnlar — bir xil amal hamma joyda bir xil nomlansin (D-043).
 * `shared/ui` komponentlari standart matnni shu yerdan oladi.
 */
export const commonText = {
  save: 'Saqlash',
  cancel: 'Bekor qilish',
  close: 'Yopish',
  confirm: 'Tasdiqlash',
  retry: 'Qayta urinish',
  loading: 'Yuklanmoqda…',
  choose: 'Tanlang…',
  all: 'Hammasi',
  reset: 'Tozalash',
  unexpectedError: 'Kutilmagan xato. Sahifani yangilab ko‘ring.',
} as const;
