import { z } from 'zod';
import { normalizeUzPhone } from '@/shared/auth/phone';

/**
 * Forma sxemalari uchun umumiy qoidalar (D-008). Matnlar o'zbekcha — zod
 * standart inglizcha xabari xodimga ko'rinmaydi.
 */

/** Majburiy matn: bo'shliqlar kesiladi, bo'sh — xato. */
export const zRequiredText = (max = 255) =>
  z
    .string()
    .trim()
    .min(1, 'Maydonni to‘ldiring')
    .max(max, `Ko‘pi bilan ${max} ta belgi`);

/** Ixtiyoriy matn: bo'sh satr → `undefined` (PATCH da "o'zgartirmaslik"). */
export const zOptionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Ko‘pi bilan ${max} ta belgi`)
    .transform((v) => (v === '' ? undefined : v));

/**
 * Musbat o'nlik son — SATR (G6). Backend `@IsPositiveDecimalString(integerDigits,
 * scale)` bilan AYNAN bir xil regex: musbat, butun qismi ≤ N raqam, verguldan
 * keyin ≤ scale raqam. Pul, m², kg — hammasi shu.
 */
export const zDecimal = (
  integerDigits: number,
  scale: number,
  messages: { required?: string; invalid?: string } = {},
) =>
  z
    .string()
    .min(1, messages.required ?? 'Qiymatni kiriting')
    .regex(
      new RegExp(`^(?!0+(?:\\.0+)?$)\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`),
      messages.invalid ?? `Musbat son: butun qismi ${integerDigits} tagacha, verguldan keyin ${scale} tagacha raqam`,
    );

/** Pul (G6) — `zDecimal` pul matnlari bilan. */
export const zMoney = (integerDigits = 12, scale = 2) =>
  zDecimal(integerDigits, scale, { required: 'Summani kiriting', invalid: 'Musbat summa kiriting' });

/** O'zbekiston telefoni → `+998901234567` (backend ko'rinishi). */
export const zUzPhone = () =>
  z.string().transform((value, ctx) => {
    const normalized = normalizeUzPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Raqamni to‘liq kiriting: 90 123 45 67' });
      return z.NEVER;
    }
    return normalized;
  });
