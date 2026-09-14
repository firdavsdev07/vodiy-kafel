/**
 * Xodim rollari — ta'rifi `prisma/schema.prisma` da (B-006).
 *
 * ⚠ Bazadagi enum ikki marta yozilmaydi: manba — Prisma sxemasi, kod esa
 *   har doim shu yerdan import qiladi ([[branch-type.enum]] ga qarang).
 *
 *   SUPER_ADMIN  — branchId = null, hamma filialni ko'radi
 *   BRANCH_ADMIN — branchId majburiy (RETAIL), faqat o'z filiali
 *   MANAGER      — branchId majburiy (RETAIL), BRANCH_ADMIN bilan bir doira
 *   MODERATOR    — branchId majburiy (CENTRAL), markaziy ombor xodimi
 *
 * SUPER_ADMIN/branchId invarianti baza darajasida ham qulflangan:
 * `users_branch_scope_check` (users_and_roles migratsiyasi).
 */
export { UserRole } from '../../prisma/prisma-client';
