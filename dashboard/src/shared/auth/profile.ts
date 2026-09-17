import type { Schema } from '@/shared/api/types';

/**
 * Xodim profili — `GET /auth/me` (D-006).
 *
 * Tur to'g'ridan-to'g'ri generatsiyadan (G2). `branchId` SUPER_ADMIN da
 * `null` — u barcha filiallarni ko'radi.
 */
export type StaffProfile = Schema<'UserProfileResponseDto'>;

export type StaffRole = StaffProfile['role'];
