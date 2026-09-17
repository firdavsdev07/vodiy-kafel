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
 * Parol chegaralari — backend bilan AYNAN bir xil
 * (`auth/dto/change-password.dto.ts`: `MIN_PASSWORD_LENGTH = 8`,
 * `@MaxLength(72)`).
 *
 * ⚠ 72 — bcrypt cheki: undan keyingi belgilar e'tiborga olinmaydi, ya'ni
 *   uzunroq parol xavfsizlikni oshirmaydi-yu, foydalanuvchini "parol
 *   to'g'ri, lekin kirmayapti" holatiga solib qo'yishi mumkin.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

/** Majburiy parol maydoni. */
export const zPassword = () =>
  z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Kamida ${MIN_PASSWORD_LENGTH} belgi`)
    .max(MAX_PASSWORD_LENGTH, `Parol ${MAX_PASSWORD_LENGTH} belgidan oshmasligi kerak`);

/**
 * IXTIYORIY parol: bo'sh qoldirilsa `undefined` — backend o'zi
 * vaqtinchalik parol yaratadi (api B-066). Yozilsa — chegaralar
 * majburiy paroldagidek.
 */
export const zOptionalPassword = () =>
  z
    .string()
    .max(MAX_PASSWORD_LENGTH, `Parol ${MAX_PASSWORD_LENGTH} belgidan oshmasligi kerak`)
    .refine((v) => v === '' || v.length >= MIN_PASSWORD_LENGTH, `Kamida ${MIN_PASSWORD_LENGTH} belgi`)
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
