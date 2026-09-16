import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

/**
 * Musbat o'nlik son — SATR ko'rinishida (`"85000.50"`, `"1.44"`).
 *
 * Kontrakt — FAQAT satr (CLAUDE.md qoida 7): JSON `number` 400 oladi.
 * Son JSON'da `double` bo'lib keladi va `0.1 + 0.2` kabi float xatosi
 * bazaga yetib borguncha qiymatni buzishi mumkin.
 *
 * Nol ham rad etiladi — nol narx yoki nol m² kalkulyatorda jimgina bepul
 * buyurtma hosil qilardi.
 *
 * @param integerDigits Butun qism uchun maksimal raqam (Postgres
 *   `Decimal(p, s)` da `p - s`).
 * @param scale Verguldan keyingi maksimal raqam (`s`).
 */
export const IsPositiveDecimalString = (integerDigits: number, scale: number) =>
  applyDecorators(
    IsString(),
    Matches(
      new RegExp(
        `^(?!0+(?:\\.0+)?$)\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`,
      ),
      {
        message: `$property musbat son bo‘lishi kerak (satr ko‘rinishida, butun qismi ${integerDigits} tagacha, verguldan keyin ${scale} tagacha raqam)`,
      },
    ),
  );

/**
 * Noldan farqli, ISHORALI o'nlik son — satr (`"-15000.50"`, `"2000"`).
 * Qoidalar `IsPositiveDecimalString` bilan bir xil, faqat oldida `-`
 * bo'lishi mumkin (masalan hisob tuzatishi — ADJUSTMENT).
 */
export const IsNonZeroDecimalString = (integerDigits: number, scale: number) =>
  applyDecorators(
    IsString(),
    Matches(
      new RegExp(
        `^-?(?!0+(?:\\.0+)?$)\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`,
      ),
      {
        message: `$property noldan farqli son bo‘lishi kerak (satr ko‘rinishida, ishorasi bilan, butun qismi ${integerDigits} tagacha, verguldan keyin ${scale} tagacha raqam)`,
      },
    ),
  );
