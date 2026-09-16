import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Token amal qilish muddati — `jsonwebtoken` kutgan ko'rinishda
 * (`'15m'`, `'30d'` yoki sekundlar soni).
 *
 * ⚠ Nega alohida tur kerak: `jsonwebtoken` bu maydonni oddiy `string`
 *   qabul qilmaydi — u `ms` kutubxonasining shablon turi (`'15m'` kabi).
 *   Muhit o'zgaruvchisi esa har doim oddiy satr bo'lib keladi. Shuning
 *   uchun formatni `envSchema` (JWT_EXPIRES / JWT_REFRESH_EXPIRES)
 *   tekshiradi, `AppConfigService` esa shu turga aylantirib beradi —
 *   natijada auth kodida birorta `as` yozilmaydi.
 */
export type TokenLifetime = NonNullable<JwtSignOptions['expiresIn']>;
