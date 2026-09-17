import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zRequiredText } from '@/shared/lib/validation';

export type Branch = Schema<'BranchAdminDto'>;
export type BranchType = Branch['type'];
export type CreateBranchBody = Schema<'CreateBranchDto'>;
export type UpdateBranchBody = Schema<'UpdateBranchDto'>;

/** Backend `PHONE_PATTERN` (branch.dto.ts) — shahar raqami ham bo'lishi mumkin. */
const PHONE_PATTERN = /^\+?[\d\s()-]{9,25}$/;
export const MAX_PHONES = 5;

/**
 * 🔒 Filial admini / moderator faqat SHU maydonlarni o'zgartira oladi
 * (backend: boshqasi → 403). SUPER_ADMIN — hammasini (`type` dan tashqari).
 */
export const CONTACT_FIELDS = [
  'address',
  'latitude',
  'longitude',
  'workingHours',
  'phones',
  'telegramUrl',
  'instagramUrl',
] as const satisfies readonly (keyof UpdateBranchBody)[];

/** Koordinata — SON (task: "son, satr emas"). Formada satr, API ga son ketadi. */
const zCoordinate = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(',', '.'))
    .refine((v) => /^-?\d{1,3}(\.\d+)?$/.test(v), `${label}: son kiriting (masalan 40.3864)`)
    .transform(Number)
    .refine((n) => n >= -limit && n <= limit, `${label}: −${limit} … ${limit}`);

/** Faqat https havola yoki bo'sh (backend `IsUrl({ protocols: ['https'] })`). */
const zHttpsUrl = z
  .string()
  .trim()
  .max(300, 'Ko‘pi bilan 300 ta belgi')
  .refine((v) => v === '' || /^https:\/\/[^\s/.]+\.[^\s]+$/i.test(v), 'https:// bilan boshlanadigan to‘liq havola');

export const branchSchema = z.object({
  type: z.enum(['RETAIL', 'CENTRAL']),
  name: zRequiredText(150),
  city: zRequiredText(100),
  address: zRequiredText(300),
  latitude: zCoordinate(90, 'Kenglik'),
  longitude: zCoordinate(180, 'Uzunlik'),
  workingHours: zRequiredText(100),
  // Har qatorda bitta raqam — xodimga 5 ta alohida maydondan qulayroq
  phones: z
    .string()
    .transform((v) => v.split('\n').map((p) => p.trim()).filter(Boolean))
    .refine((list) => list.length >= 1, 'Kamida bitta telefon')
    .refine((list) => list.length <= MAX_PHONES, `Ko‘pi bilan ${MAX_PHONES} ta telefon`)
    .refine((list) => list.every((p) => PHONE_PATTERN.test(p)), 'Har qatorda bitta raqam: +998 73 244 00 00'),
  telegramUrl: zHttpsUrl,
  instagramUrl: zHttpsUrl,
  sortOrder: z.string().trim().regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)').transform(Number),
});

export type BranchFormInput = z.input<typeof branchSchema>;
export type BranchFormValues = z.output<typeof branchSchema>;

export function branchDefaults(branch?: Branch): BranchFormInput {
  return {
    type: branch?.type ?? 'RETAIL',
    name: branch?.name ?? '',
    city: branch?.city ?? '',
    address: branch?.address ?? '',
    latitude: branch ? String(branch.latitude) : '',
    longitude: branch ? String(branch.longitude) : '',
    workingHours: branch?.workingHours ?? '',
    phones: branch?.phones.join('\n') ?? '',
    telegramUrl: branch?.telegramUrl ?? '',
    instagramUrl: branch?.instagramUrl ?? '',
    sortOrder: String(branch?.sortOrder ?? 0),
  };
}

export function toCreateBranchBody(v: BranchFormValues): CreateBranchBody {
  return {
    type: v.type,
    name: v.name,
    city: v.city,
    address: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
    workingHours: v.workingHours,
    phones: v.phones,
    ...(v.telegramUrl ? { telegramUrl: v.telegramUrl } : {}),
    ...(v.instagramUrl ? { instagramUrl: v.instagramUrl } : {}),
    sortOrder: v.sortOrder,
  };
}

/**
 * PATCH — faqat O'ZGARGAN maydonlar. `type` HECH QACHON yuborilmaydi (keyin
 * o'zgarmaydi). Havola bo'shatilsa — `null` (backend nullable).
 * 🔒 `fullAccess: false` (filial admini, moderator) — faqat `CONTACT_FIELDS`;
 *    aks holda bitta begona maydon butun so'rovni 403 qilardi.
 */
export function toUpdateBranchBody(v: BranchFormValues, branch: Branch, fullAccess: boolean): UpdateBranchBody {
  const next: Required<Omit<UpdateBranchBody, 'isActive'>> = {
    name: v.name,
    city: v.city,
    address: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
    workingHours: v.workingHours,
    phones: v.phones,
    telegramUrl: v.telegramUrl || null,
    instagramUrl: v.instagramUrl || null,
    sortOrder: v.sortOrder,
  };
  const current: typeof next = {
    name: branch.name,
    city: branch.city,
    address: branch.address,
    latitude: branch.latitude,
    longitude: branch.longitude,
    workingHours: branch.workingHours,
    phones: branch.phones,
    telegramUrl: branch.telegramUrl ?? null,
    instagramUrl: branch.instagramUrl ?? null,
    sortOrder: branch.sortOrder,
  };
  const allowed: readonly (keyof typeof next)[] = fullAccess ? (Object.keys(next) as (keyof typeof next)[]) : CONTACT_FIELDS;

  const body: UpdateBranchBody = {};
  for (const key of allowed) {
    if (JSON.stringify(next[key]) !== JSON.stringify(current[key])) {
      (body as Record<string, unknown>)[key] = next[key];
    }
  }
  return body;
}
