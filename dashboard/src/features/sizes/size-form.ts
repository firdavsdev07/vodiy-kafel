import { z } from 'zod';
import type { Schema } from '@/shared/api';

export type Size = Schema<'SizeAdminResponseDto'>;
export type CreateSizeBody = Schema<'CreateSizeDto'>;
/** ⚠ VAQTINCHALIK (api B-059): generatsiyada PATCH `sortOrder` majburiy bo'lib chiqqan. */
export type UpdateSizeBody = Partial<Schema<'UpdateSizeDto'>>;

/** Backend `CreateSizeDto`: MIN_SIDE_CM = 1, MAX_SIDE_CM = 1000 (butun sm). */
export const MIN_SIDE_CM = 1;
export const MAX_SIDE_CM = 1000;

const zSide = z
  .string()
  .trim()
  .regex(/^\d{1,4}$/, 'Butun son, sm')
  .transform(Number)
  .refine((n) => n >= MIN_SIDE_CM && n <= MAX_SIDE_CM, `${MIN_SIDE_CM}–${MAX_SIDE_CM} sm oralig‘ida`);

export const sizeSchema = z.object({
  widthCm: zSide,
  heightCm: zSide,
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)')
    .transform(Number),
});

export type SizeFormInput = z.input<typeof sizeSchema>;
export type SizeFormValues = z.output<typeof sizeSchema>;

export function sizeDefaults(size?: Size): SizeFormInput {
  return {
    widthCm: size ? String(size.widthCm) : '',
    heightCm: size ? String(size.heightCm) : '',
    sortOrder: String(size?.sortOrder ?? 0),
  };
}

/**
 * Backend yozuvni o'zi yasaydi (`60` × `60` → `"60x60"`) — bu faqat formada
 * oldindan ko'rsatish uchun; serverga YUBORILMAYDI.
 */
export function previewLabel(widthCm: string, heightCm: string): string | null {
  const w = widthCm.trim();
  const h = heightCm.trim();
  return /^\d+$/.test(w) && /^\d+$/.test(h) ? `${Number(w)}x${Number(h)}` : null;
}

/** PATCH — faqat o'zgargan maydonlar. */
export function toUpdateBody(values: SizeFormValues, size: Size): UpdateSizeBody {
  const body: UpdateSizeBody = {};
  if (values.widthCm !== size.widthCm) body.widthCm = values.widthCm;
  if (values.heightCm !== size.heightCm) body.heightCm = values.heightCm;
  if (values.sortOrder !== size.sortOrder) body.sortOrder = values.sortOrder;
  return body;
}

/** O'lcham o'zgaryaptimi (tartib emas) — mahsulotlarga ta'sir ogohlantirishi uchun. */
export function changesDimensions(body: UpdateSizeBody): boolean {
  return body.widthCm !== undefined || body.heightCm !== undefined;
}
