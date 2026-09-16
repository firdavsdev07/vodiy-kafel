import type { TransformFnParams } from 'class-transformer';

/**
 * Query / multipart satridagi `"true"` / `"false"` → boolean.
 *
 * ⚠ `@Type(() => Boolean)` yaramaydi: u `Boolean("false")` ni chaqiradi va
 *   `true` qaytaradi — `?isActive=false` filtri jimgina teskari ishlardi.
 *   Tanilmagan qiymat o'zgarishsiz qaytadi va `@IsBoolean()` uni 400 bilan
 *   rad etadi.
 */
export const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

/**
 * Query / multipart satridagi butun son → number.
 *
 * `@Type(() => Number)` dan farqi: bo'sh satr `0` ga, `"1.5"` yoki `"12abc"`
 * `NaN` yoki kutilmagan songa aylanmaydi — faqat to'liq butun son satri
 * o'giriladi, qolgani o'zgarishsiz qaytib, `@IsInt()` da 400 oladi.
 */
export const toOptionalInt = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' && /^-?\d{1,15}$/.test(value.trim())
    ? Number(value.trim())
    : value;
