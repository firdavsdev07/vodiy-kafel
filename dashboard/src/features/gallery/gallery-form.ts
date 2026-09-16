import { z } from 'zod';
import type { Schema } from '@/shared/api';
import type { ProductRef } from '@/features/products/similar';

export type GalleryItem = Schema<'GalleryAdminItemDto'>;
export type UpdateGalleryBody = Schema<'UpdateGalleryItemDto'>;

/**
 * Galereya yozuvi (D-015). Backend: sarlavha ≤200 (ixtiyoriy), BITTA
 * bog'langan mahsulot (ixtiyoriy), tartib — butun ≥0, holat. Rasmning o'zi
 * tahrirlanmaydi — yangi rasm = yangi yozuv.
 */
export const galleryMetaSchema = z.object({
  title: z.string().trim().max(200, 'Ko‘pi bilan 200 ta belgi'),
  product: z.custom<ProductRef | null>(),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)')
    .transform(Number),
  isActive: z.boolean(),
});

export type GalleryFormInput = z.input<typeof galleryMetaSchema>;
export type GalleryFormValues = z.output<typeof galleryMetaSchema>;

export function galleryDefaults(item?: GalleryItem): GalleryFormInput {
  return {
    title: item?.title ?? '',
    product: item?.product ?? null,
    sortOrder: String(item?.sortOrder ?? 0),
    isActive: item?.isActive ?? true,
  };
}

/** Yangi yozuv: multipart maydonlari (fayl alohida qo'shiladi). Bo'sh qiymatlar yuborilmaydi. */
export function toCreateFields(values: GalleryFormValues): Record<string, string> {
  return {
    ...(values.title ? { title: values.title } : {}),
    ...(values.product ? { productId: values.product.id } : {}),
    sortOrder: String(values.sortOrder),
  };
}

/**
 * PATCH — faqat o'zgarganlar. Bu yerda backend `null` ni QABUL qiladi:
 * bo'shatilgan sarlavha → `title: null`, olib tashlangan mahsulot →
 * `productId: null`.
 */
export function toUpdateBody(values: GalleryFormValues, item: GalleryItem): UpdateGalleryBody {
  const body: UpdateGalleryBody = {};
  const title = values.title || null;
  if (title !== (item.title ?? null)) body.title = title;
  const productId = values.product?.id ?? null;
  if (productId !== (item.product?.id ?? null)) body.productId = productId;
  if (values.sortOrder !== item.sortOrder) body.sortOrder = values.sortOrder;
  if (values.isActive !== item.isActive) body.isActive = values.isActive;
  return body;
}
