import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zOptionalText, zRequiredText } from '@/shared/lib/validation';

/**
 * ⚠ VAQTINCHALIK (api B-059): generatsiyada `description`/`websiteUrl`
 * `Record<string, never>`, PATCH da `sortOrder` majburiy bo'lib chiqqan.
 * B-059 tuzatilgach `Schema<...>` ning o'zi ishlatiladi.
 */
export type Factory = Omit<Schema<'FactoryAdminResponseDto'>, 'description' | 'websiteUrl'> & {
  description: string | null;
  websiteUrl: string | null;
};
export type CreateFactoryBody = Schema<'CreateFactoryDto'>;
export type UpdateFactoryBody = Partial<Schema<'UpdateFactoryDto'>>;

/**
 * Zavod formasi (D-009). Chegaralar backend `CreateFactoryDto` bilan bir xil:
 * name ≤120, logoUrl ≤500, description ≤2000, websiteUrl — to'liq URL,
 * sortOrder — butun ≥0.
 */
export const factorySchema = z.object({
  name: zRequiredText(120),
  logoUrl: zRequiredText(500).refine(
    (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
    'Fayl yo‘li (/uploads/…) yoki http(s) havola kiriting',
  ),
  description: zOptionalText(2000),
  websiteUrl: zOptionalText(500).refine(
    (v) => v === undefined || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v),
    'To‘liq manzil kiriting: https://…',
  ),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)')
    .transform(Number),
});

export type FactoryFormInput = z.input<typeof factorySchema>;
export type FactoryFormValues = z.output<typeof factorySchema>;

export function factoryDefaults(factory?: Factory): FactoryFormInput {
  return {
    name: factory?.name ?? '',
    logoUrl: factory?.logoUrl ?? '',
    description: factory?.description ?? '',
    websiteUrl: factory?.websiteUrl ?? '',
    sortOrder: String(factory?.sortOrder ?? 0),
  };
}

export function toCreateBody(values: FactoryFormValues): CreateFactoryBody {
  return {
    name: values.name,
    logoUrl: values.logoUrl,
    ...(values.description ? { description: values.description } : {}),
    ...(values.websiteUrl ? { websiteUrl: values.websiteUrl } : {}),
    sortOrder: values.sortOrder,
  };
}

/**
 * PATCH tanasi — faqat O'ZGARGAN maydonlar ("faqat yuborilgan maydonlar
 * o'zgaradi"). ⚠ Backend `description`/`websiteUrl` ni `null` ga tushirishni
 * qabul qilmaydi — bo'shatilgan maydon yuborilmaydi (UI buni aytadi).
 */
export function toUpdateBody(values: FactoryFormValues, factory: Factory): UpdateFactoryBody {
  const body: UpdateFactoryBody = {};
  if (values.name !== factory.name) body.name = values.name;
  if (values.logoUrl !== factory.logoUrl) body.logoUrl = values.logoUrl;
  if (values.description && values.description !== (factory.description ?? undefined)) {
    body.description = values.description;
  }
  if (values.websiteUrl && values.websiteUrl !== (factory.websiteUrl ?? undefined)) {
    body.websiteUrl = values.websiteUrl;
  }
  if (values.sortOrder !== factory.sortOrder) body.sortOrder = values.sortOrder;
  return body;
}
