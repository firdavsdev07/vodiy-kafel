import { z } from 'zod';

/**
 * Muhit o'zgaruvchilari sxemasi.
 *
 * Bu yerda tasvirlanmagan o'zgaruvchi kodda ISHLATILMAYDI.
 * Noto'g'ri yoki yetishmayotgan qiymat bo'lsa — dastur ishga tushmaydi
 * (tez xato = yaxshi xato: production'da yarim ishlaydigan holat bo'lmasin).
 */
/**
 * Token muddati formati: `15m`, `30d`, `900s` yoki sof sekundlar (`900`).
 *
 * ⚠ Nega tekshiriladi: `jsonwebtoken` tanimagan satrni (masalan `15min`)
 *   jimgina e'tiborsiz qoldiradi — token MUDDATSIZ chiqib ketardi.
 *   Shu sababli format shu yerda ushlanadi: `AppConfigService` qiymatni
 *   `TokenLifetime` turiga aylantirishi ham shunga tayanadi.
 */
const TOKEN_LIFETIME_PATTERN = /^\d+(ms|s|m|h|d|w|y)?$/;
const TOKEN_LIFETIME_MESSAGE =
  'Muddat `15m`, `30d`, `900s` yoki sekundlar soni ko‘rinishida bo‘lishi kerak';

export const envSchema = z.object({
  // — Umumiy —
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  APP_URL: z.url().default('http://localhost:3000'),

  // — Ma'lumotlar bazasi —
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL bo‘sh bo‘lishi mumkin emas')
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      'DATABASE_URL postgresql:// bilan boshlanishi kerak',
    ),

  // — Autentifikatsiya (B-014 uchun) —
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET kamida 32 belgidan iborat bo‘lishi kerak'),
  JWT_EXPIRES: z
    .string()
    .regex(TOKEN_LIFETIME_PATTERN, TOKEN_LIFETIME_MESSAGE)
    .default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET kamida 32 belgidan iborat bo‘lishi kerak'),
  JWT_REFRESH_EXPIRES: z
    .string()
    .regex(TOKEN_LIFETIME_PATTERN, TOKEN_LIFETIME_MESSAGE)
    .default('30d'),

  // — Hujjatlar —
  // Swagger'ni production'da o'chirish uchun: SWAGGER_ENABLED=false
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // — CORS —
  // Vergul bilan ajratilgan ro'yxat yoki '*'
  CORS_ORIGINS: z.string().default('*'),

  // — Fayl saqlash (B-022) —
  // Yuklangan fayllar papkasi (loyiha ildiziga nisbatan yoki absolyut yo'l).
  // `/uploads/...` manzili orqali beriladi.
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * ConfigModule.forRoot({ validate }) uchun.
 * Xato bo'lsa — o'qiladigan ko'rinishda chiqaradi va dasturni to'xtatadi.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(
      `\n❌ Muhit o'zgaruvchilari noto'g'ri:\n${details}\n\n` +
        `→ .env faylini .env.example bilan solishtiring.\n`,
    );
  }

  return result.data;
}
