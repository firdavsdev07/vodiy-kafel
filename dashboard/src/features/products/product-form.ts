import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { normalizeDecimal } from '@/shared/lib/format';
import { zDecimal, zOptionalText, zRequiredText } from '@/shared/lib/validation';

export type Product = Schema<'ProductAdminResponseDto'>;
export type CreateProductBody = Schema<'CreateProductDto'>;
export type UpdateProductBody = Schema<'UpdateProductDto'>;

/**
 * Mahsulot formasi (D-012). Chegaralar backend `CreateProductDto` bilan bir
 * xil: name ≤150, color ≤60, description ≤2000, sqmPerPallet —
 * `@IsPositiveDecimalString(6, 4)`, weightPerPallet — `(7, 3)`.
 * ⚠ NARX ham, ZAXIRA ham bu yerda YO'Q — ular filial/ombor jadvalida.
 */
export const productSchema = z.object({
  name: zRequiredText(150),
  factoryId: z.string().min(1, 'Zavodni tanlang'),
  sizeId: z.string().min(1, 'O‘lchamni tanlang'),
  surface: z.enum(['POL', 'DEVOR'], { message: 'Sirtni tanlang' }),
  color: zOptionalText(60),
  description: zOptionalText(2000),
  sqmPerPallet: zDecimal(6, 4, {
    required: 'Paddondagi m² ni kiriting — kalkulyator uchun majburiy',
    invalid: 'Musbat son, verguldan keyin 4 tagacha raqam',
  }),
  weightPerPallet: zDecimal(7, 3, {
    required: 'Paddon og‘irligini kiriting',
    invalid: 'Musbat son, verguldan keyin 3 tagacha raqam',
  }),
});

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;

export function productDefaults(product?: Product): ProductFormInput {
  return {
    name: product?.name ?? '',
    factoryId: product?.factory.id ?? '',
    sizeId: product?.size.id ?? '',
    // Bo'sh qiymat select'da "Tanlang…" — zod xabari chiqadi
    surface: (product?.surface ?? '') as ProductFormInput['surface'],
    color: product?.color ?? '',
    description: product?.description ?? '',
    sqmPerPallet: product ? normalizeDecimal(product.sqmPerPallet) : '',
    weightPerPallet: product ? normalizeDecimal(product.weightPerPallet) : '',
  };
}

export function toCreateBody(v: ProductFormValues): CreateProductBody {
  return {
    name: v.name,
    factoryId: v.factoryId,
    sizeId: v.sizeId,
    surface: v.surface,
    ...(v.color ? { color: v.color } : {}),
    ...(v.description ? { description: v.description } : {}),
    sqmPerPallet: v.sqmPerPallet,
    weightPerPallet: v.weightPerPallet,
  };
}

/**
 * PATCH — faqat O'ZGARGAN maydonlar. O'nlik sonlar qiymat bo'yicha
 * solishtiriladi (`"43.2000"` = `"43.2"`). ⚠ Backend `color`/`description` ni
 * `null` ga tushirmaydi — bo'shatilgan maydon yuborilmaydi.
 */
export function toUpdateBody(v: ProductFormValues, p: Product): UpdateProductBody {
  const body: UpdateProductBody = {};
  if (v.name !== p.name) body.name = v.name;
  if (v.factoryId !== p.factory.id) body.factoryId = v.factoryId;
  if (v.sizeId !== p.size.id) body.sizeId = v.sizeId;
  if (v.surface !== p.surface) body.surface = v.surface;
  if (v.color && v.color !== (p.color ?? undefined)) body.color = v.color;
  if (v.description && v.description !== (p.description ?? undefined)) body.description = v.description;
  if (normalizeDecimal(v.sqmPerPallet) !== normalizeDecimal(p.sqmPerPallet)) body.sqmPerPallet = v.sqmPerPallet;
  if (normalizeDecimal(v.weightPerPallet) !== normalizeDecimal(p.weightPerPallet)) {
    body.weightPerPallet = v.weightPerPallet;
  }
  return body;
}

/** Kalkulyatorga kiradigan maydon o'zgaryaptimi — ogohlantirish uchun. */
export function changesCalculation(input: Pick<ProductFormInput, 'sqmPerPallet' | 'weightPerPallet'>, p: Product): boolean {
  const differs = (a: string, b: string) => /^\d+(\.\d+)?$/.test(a) && normalizeDecimal(a) !== normalizeDecimal(b);
  return differs(input.sqmPerPallet, p.sqmPerPallet) || differs(input.weightPerPallet, p.weightPerPallet);
}
