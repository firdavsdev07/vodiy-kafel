import type { StaffRole } from '@/shared/auth/profile';
import type { OrderStatus, PaymentStatus, StockStatus } from './status-tone';

/**
 * Enum → o'zbekcha matn — YAGONA lug'at (G7). D-043 da to'liq kengaytiriladi;
 * hozir faqat kerak bo'lganlar.
 */
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

/** Mahsulot sirti (api/docs/enums.md — ProductSurface). */
export const surfaceLabel = {
  POL: 'Pol',
  DEVOR: 'Devor',
} as const satisfies Record<'POL' | 'DEVOR', string>;

/** Mahsulot media turi (api/docs/enums.md — MediaType). */
export const mediaTypeLabel = {
  IMAGE: 'Rasm',
  IMAGE_360: '360° rasm',
  VIDEO_360: '360° video',
} as const satisfies Record<'IMAGE' | 'IMAGE_360' | 'VIDEO_360', string>;
