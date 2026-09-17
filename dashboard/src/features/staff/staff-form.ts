import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { formatUzPhone } from '@/shared/lib/format';
import { zRequiredText, zUzPhone } from '@/shared/lib/validation';

export type Staff = Schema<'StaffDto'>;
export type StaffRoleKind = Staff['role'];
export type CreateStaffBody = Schema<'CreateStaffDto'>;
export type UpdateStaffBody = Schema<'UpdateStaffDto'>;

/** Backend `TELEGRAM_USERNAME` — boshidagi @ ni backend o'zi olib tashlaydi. */
const TELEGRAM_USERNAME = /^@?[A-Za-z0-9_]{5,32}$/;

export type StaffFilters = { search: string; isActive: string; branchId: string };

/**
 * Xodim formasi — menejer (D-035) va moderator (D-036) uchun bitta.
 * Login — TELEFON (kirish sahifasi `+998` 9 raqam kutadi, shuning uchun
 * backenddan torroq: faqat O'zbekiston raqami).
 * 🔒 `branchRequired` — faqat SUPER_ADMIN; filial admini uchun maydon YO'Q (G5).
 */
export function staffSchema(opts: { branchRequired: boolean }) {
  return z.object({
    fullName: zRequiredText(150),
    phone: zUzPhone(),
    telegramUsername: z
      .string()
      .trim()
      .refine((v) => v === '' || TELEGRAM_USERNAME.test(v), 'Telegram username: 5–32 lotin harf, raqam yoki _')
      .transform((v) => v.replace(/^@/, '')),
    branchId: opts.branchRequired ? z.string().min(1, 'Filialni tanlang') : z.string(),
  });
}

export type StaffFormInput = z.input<ReturnType<typeof staffSchema>>;
export type StaffFormValues = z.output<ReturnType<typeof staffSchema>>;

export function staffDefaults(staff?: Staff): StaffFormInput {
  return {
    fullName: staff?.fullName ?? '',
    phone: staff ? formatUzPhone(staff.phone) : '',
    telegramUsername: staff?.telegramUsername ?? '',
    branchId: staff?.branch.id ?? '',
  };
}

/** Yaratish. `branchId` faqat berilganda (SUPER_ADMIN) — filial admini uchun backend o'zi qo'yadi. */
export function toCreateStaffBody(v: StaffFormValues): CreateStaffBody {
  return {
    fullName: v.fullName,
    phone: v.phone,
    ...(v.telegramUsername ? { telegramUsername: v.telegramUsername } : {}),
    ...(v.branchId ? { branchId: v.branchId } : {}),
  };
}

/**
 * PATCH — faqat o'zgarganlar. Telegram bo'shatilsa `null`.
 * 🔒 `canChangeBranch` — faqat SUPER_ADMIN (boshqa filialga o'tkazish).
 */
export function toUpdateStaffBody(v: StaffFormValues, staff: Staff, canChangeBranch: boolean): UpdateStaffBody {
  const body: UpdateStaffBody = {};
  if (v.fullName !== staff.fullName) body.fullName = v.fullName;
  if (v.phone !== staff.phone) body.phone = v.phone;
  const telegram = v.telegramUsername || null;
  if (telegram !== (staff.telegramUsername ?? null)) body.telegramUsername = telegram;
  if (canChangeBranch && v.branchId && v.branchId !== staff.branch.id) body.branchId = v.branchId;
  return body;
}

/** `vk_fargona` → `https://t.me/vk_fargona` (mijoz bilan bog'lanish havolasi, TZ 3.12). */
export function telegramHref(username: string): string {
  return `https://t.me/${encodeURIComponent(username.replace(/^@/, ''))}`;
}

export function toStaffQuery(filters: Partial<StaffFilters>) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.isActive === 'true' || filters.isActive === 'false' ? { isActive: filters.isActive === 'true' } : {}),
  };
}
