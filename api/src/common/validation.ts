import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * Global ValidationPipe sozlamasi — main.ts ham, DTO testlari ham SHU
 * obyektni ishlatadi (test boshqa sozlama bilan o'tib, prod'da yiqilmasin).
 *
 * whitelist: DTO'da e'lon qilinmagan maydonlar jimgina olib tashlanadi —
 * frontend "price" yuborsa, u yo'qoladi (G2).
 *
 * ⚠ `enableImplicitConversion` ATAYLAB O'CHIQ. U JSON turlarini "moslab"
 *   yuborardi: `"isUrgent": "false"` → `true`, `"pallets": true` → `1` —
 *   noto'g'ri qiymat 400 o'rniga jimgina saqlanardi. JSON o'z turini
 *   o'zi olib keladi; satr keladigan joylarda (query, multipart) konversiya
 *   aniq yoziladi: `@Type(() => Number)`, `toOptionalInt`, `toOptionalBoolean`.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
};
