import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zRequiredText } from '@/shared/lib/validation';

export type Partner = Schema<'PartnerAdminDto'>;
export type UpdatePartnerBody = Schema<'UpdatePartnerDto'>;

/**
 * Hamkor formasi (D-034). Backend: nom ≤150, sayt — to'liq http(s) havola
 * ≤300 (ixtiyoriy), tartib — butun ≥0. Logotip — alohida fayl.
 */
export const partnerSchema = z.object({
  name: zRequiredText(150),
  websiteUrl: z
    .string()
    .trim()
    .max(300, 'Ko‘pi bilan 300 ta belgi')
    .refine((v) => v === '' || /^https?:\/\/[^\s/.]+\.[^\s]+$/i.test(v), 'To‘liq manzil kiriting: https://…'),
  sortOrder: z.string().trim().regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)').transform(Number),
  isActive: z.boolean(),
});

export type PartnerFormInput = z.input<typeof partnerSchema>;
export type PartnerFormValues = z.output<typeof partnerSchema>;

export function partnerDefaults(partner?: Partner, nextSortOrder = 0): PartnerFormInput {
  return {
    name: partner?.name ?? '',
    websiteUrl: partner?.websiteUrl ?? '',
    sortOrder: String(partner?.sortOrder ?? nextSortOrder),
    isActive: partner?.isActive ?? true,
  };
}

/** Yangi hamkor — multipart maydonlari (fayl alohida). Bo'sh sayt yuborilmaydi. */
export function toCreatePartnerFields(v: PartnerFormValues): Record<string, string> {
  return {
    name: v.name,
    ...(v.websiteUrl ? { websiteUrl: v.websiteUrl } : {}),
    sortOrder: String(v.sortOrder),
  };
}

/** PATCH — faqat o'zgarganlar; sayt bo'shatilsa `null` (backend qabul qiladi). */
export function toUpdatePartnerBody(v: PartnerFormValues, partner: Partner): UpdatePartnerBody {
  const body: UpdatePartnerBody = {};
  if (v.name !== partner.name) body.name = v.name;
  const website = v.websiteUrl || null;
  if (website !== (partner.websiteUrl ?? null)) body.websiteUrl = website;
  if (v.sortOrder !== partner.sortOrder) body.sortOrder = v.sortOrder;
  if (v.isActive !== partner.isActive) body.isActive = v.isActive;
  return body;
}

/**
 * Tartibni surish (yuqoriga/pastga). Qaytadi: tartibi O'ZGARADIGAN hamkorlar
 * va yangi `sortOrder` (0, 1, 2…). Ro'yxat to'liq bo'lishi SHART (filtrsiz) —
 * aks holda yashirilganlar bilan raqamlar to'qnashadi.
 */
export function reorderPatches(list: readonly Partner[], index: number, direction: -1 | 1): { id: string; sortOrder: number }[] {
  const to = index + direction;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item as Partner);
  return next.flatMap((p, i) => (p.sortOrder === i ? [] : [{ id: p.id, sortOrder: i }]));
}
