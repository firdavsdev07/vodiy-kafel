import type { StaffRole } from '@/shared/auth/profile';

/**
 * Rol → ruxsat jadvali — YAGONA joy (D-007). Manba:
 * `api/src/**\/*.admin.controller.ts` dagi `@Roles(...)`. Backenddagi rol
 * o'zgarsa — faqat shu fayl tahrirlanadi.
 *
 * ⚠ G4: bu FAQAT UX (menyu, tugma, 403 sahifasi). Backend baribir o'zi
 * tekshiradi — bu yerdagi xato xavfsizlik teshigi emas, lekin xodimni
 * chalg'itadi.
 */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'BRANCH_ADMIN',
  'MANAGER',
  'MODERATOR',
] as const satisfies readonly StaffRole[];

const ALL_STAFF = STAFF_ROLES;

export const PERMISSIONS = {
  // ── Katalog: zavod, o'lcham, mahsulot, media, galereya, o'xshashlar ──
  /** GET /admin/products, /factories, /sizes, /gallery, …/media */
  'catalog.view': ALL_STAFF,
  /** POST/PATCH/DELETE — o'sha endpointlar */
  'catalog.write': ['SUPER_ADMIN'],

  // ── Narx va zaxira ──
  /**
   * GET /admin/branch-products backendda barcha xodimga ochiq, lekin
   * MODERATOR (markaziy ombor) chakana narx bilan ishlamaydi — task.txt D-007:
   * "MODERATOR ga Narxlar ko'rinmaydi".
   */
  'prices.view': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER'],
  /** PUT /admin/branch-products, PATCH …/{id}/price */
  'prices.write': ['SUPER_ADMIN', 'BRANCH_ADMIN'],
  /** GET/POST/DELETE /admin/customers/{id}/pricing-rules */
  'pricingRules.manage': ['SUPER_ADMIN', 'BRANCH_ADMIN'],
  /** GET /admin/product-stocks */
  'stock.view': ALL_STAFF,
  /** PUT /admin/product-stocks */
  'stock.write': ['SUPER_ADMIN', 'MODERATOR'],

  // ── Mijoz va moliya ──
  /** GET/POST/PATCH /admin/customers, reset-password */
  'customers.manage': ALL_STAFF,
  /**
   * Barcha filial mijozlari — filial filtri/ustuni, yaratishda filial
   * tanlash, boshqa filialga ko'chirish. T-001 (2026-09-25): MODERATOR ham
   * (backend: BranchScopeService `CUSTOMERS` domeni).
   */
  'customers.allBranches': ['SUPER_ADMIN', 'MODERATOR'],
  /** PATCH /admin/customers/{id}/active */
  'customers.toggleActive': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],
  /** POST /admin/customers/{id}/transactions */
  'accounts.write': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],
  /** PATCH /admin/payments/{id}/confirm */
  'payments.confirm': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],

  /**
   * POST/GET /admin/announcements — mijozlarga xabar (T-009). Barcha xodim;
   * DOIRA backendda (menejer — faqat o'z mijozlari).
   */
  'announcements.send': ALL_STAFF,

  // ── Buyurtmalar ──
  /** GET/POST /admin/orders, PATCH …/urgent, …/status */
  'orders.manage': ALL_STAFF,
  /**
   * PATCH /admin/orders/{id}/delivery — jo'natish ombori, yo'nalish, yo'l
   * kira (T-004). Mijoz va filial xodimi yetkazib berishni faqat so'raydi.
   */
  'orders.setDelivery': ['SUPER_ADMIN', 'MODERATOR'],
  /** PATCH /admin/orders/{id}/assign */
  'orders.assign': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],
  /** /admin/branch-orders — markaz qabul qiladi (D-030, D-031) */
  'supplyOrders.review': ['SUPER_ADMIN', 'MODERATOR'],
  /** /branch-orders — do'kon filiali buyurtma beradi (D-032) */
  'supplyOrders.create': ['BRANCH_ADMIN', 'MANAGER'],

  // ── Tashkilot ──
  /** GET /admin/branches, /admin/partners */
  'branches.view': ALL_STAFF,
  /** POST, DELETE /admin/branches */
  'branches.create': ['SUPER_ADMIN'],
  /** PATCH /admin/branches/{id}, POST …/image (BRANCH_ADMIN — faqat o'ziniki) */
  'branches.edit': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],
  /** POST/PATCH/DELETE /admin/partners */
  'partners.write': ['SUPER_ADMIN'],
  /** /admin/managers */
  'managers.manage': ['SUPER_ADMIN', 'BRANCH_ADMIN'],
  /**
   * GET /admin/managers — faqat o'qish: mijozni menejerga biriktirish,
   * buyurtmalarni menejer bo'yicha filtrlash. T-001: MODERATOR ham.
   */
  'managers.view': ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MODERATOR'],
  /** /admin/moderators */
  'moderators.manage': ['SUPER_ADMIN'],

  // ── Yetkazib berish ──
  /** GET /admin/regions, /transport-types, /tariffs */
  'delivery.view': ALL_STAFF,
  /** POST/PATCH/DELETE /admin/regions, /admin/transport-types */
  'delivery.write': ['SUPER_ADMIN'],
  /** PUT /admin/tariffs, PATCH …/{id}/price */
  'tariffs.write': ['SUPER_ADMIN', 'BRANCH_ADMIN'],

  // ── Sozlamalar ──
  /** GET /admin/settings */
  'settings.view': ['SUPER_ADMIN', 'BRANCH_ADMIN'],
  /** PATCH /admin/settings */
  'settings.write': ['SUPER_ADMIN'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Rolga ruxsat bormi. Rol noma'lum (profil hali yuklanmagan) → yo'q. */
export function can(role: StaffRole | null | undefined, permission: Permission): boolean {
  return role != null && hasRole(role, PERMISSIONS[permission]);
}

/** Bir nechta rol ro'yxatidan birortasiga kiradimi. */
export function hasRole(
  role: StaffRole | null | undefined,
  roles: readonly StaffRole[],
): boolean {
  return role != null && roles.includes(role);
}

/** Ruxsatlardan KAMIDA BITTASI bo'lgan rollar — bir bo'lim ikki tomonga xizmat qilsa. */
export function rolesForAny(...permissions: readonly Permission[]): readonly StaffRole[] {
  return STAFF_ROLES.filter((role) => permissions.some((p) => can(role, p)));
}
