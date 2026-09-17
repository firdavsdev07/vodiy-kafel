import type { Schema } from '@/shared/api/types';

/**
 * Xodim profili — `GET /auth/me` (D-006).
 *
 * Tur to'g'ridan-to'g'ri generatsiyadan (G2). `branchId` SUPER_ADMIN da
 * `null` — u barcha filiallarni ko'radi.
 */
export type StaffProfile = Schema<'UserProfileResponseDto'>;

export type StaffRole = StaffProfile['role'];

/**
 * Optom mijoz profili — `GET /me/profile` (api B-065, D-051).
 *
 * ⚠ Xodim profilidan BOSHQA endpoint va boshqa shakl: bu yerda rol emas,
 *   kompaniya nomi va biriktirilgan filial bor. Ikkisi hech qachon
 *   birlashtirilmaydi — `GET /auth/me` mijoz tokeni bilan 401 qaytaradi.
 */
export type CustomerProfile = Schema<'CustomerProfileResponseDto'>;
