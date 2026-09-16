import type { StaffRole } from '@/shared/auth/profile';

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
